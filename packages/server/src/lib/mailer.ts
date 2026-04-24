import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { findPlatformConfig } from "@/repositories/platformConfig";

let transporter: Transporter | null = null;
let cachedConfigHash = "";

interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}

function hashConfig(c: SmtpConfig): string {
  return `${c.smtpHost}:${c.smtpPort}:${c.smtpUser}:${c.smtpPass}:${c.smtpSecure}`;
}

async function resolveSmtpConfig(): Promise<SmtpConfig | null> {
  const envHost = process.env.SMTP_HOST || "";
  const envUser = process.env.SMTP_USER || "";
  const envPass = process.env.SMTP_PASS || "";

  if (envHost && envUser && envPass) {
    return {
      smtpHost: envHost,
      smtpPort: Number(process.env.SMTP_PORT) || 587,
      smtpUser: envUser,
      smtpPass: envPass,
      smtpSecure: process.env.SMTP_SECURE === "true",
    };
  }

  const dbConfig = await findPlatformConfig();
  if (
    dbConfig &&
    dbConfig.smtpHost &&
    dbConfig.smtpUser &&
    dbConfig.smtpPass
  ) {
    return {
      smtpHost: dbConfig.smtpHost,
      smtpPort: dbConfig.smtpPort,
      smtpUser: dbConfig.smtpUser,
      smtpPass: dbConfig.smtpPass,
      smtpSecure: dbConfig.smtpSecure,
    };
  }

  return null;
}

async function buildTransporter(): Promise<Transporter | null> {
  const config = await resolveSmtpConfig();
  if (!config) return null;

  const cfgHash = hashConfig(config);
  if (transporter && cachedConfigHash === cfgHash) {
    return transporter;
  }

  // Auto-detect TLS settings based on port:
  // - 465 (SSL/TLS): secure=true
  // - 587 (STARTTLS): secure=false + requireTLS=true
  // - others: respect env/config settings
  const useSecure = config.smtpPort === 465 ? true : config.smtpSecure;
  const requireTLS = config.smtpPort === 587 ? true : false;

  const transportOptions = {
    host: config.smtpHost,
    port: config.smtpPort,
    secure: useSecure,
    requireTLS,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
    logger: false,
    debug: false,
  };

  console.log(
    `[SMTP] Connecting to ${config.smtpHost}:${config.smtpPort} (secure=${useSecure}, requireTLS=${requireTLS})`
  );

  const t = nodemailer.createTransport(transportOptions);

  try {
    await t.verify();
    console.log(`[SMTP] Connection verified OK`);
  } catch (verifyErr) {
    const err = verifyErr as Error & { code?: string; command?: string };
    console.error(
      `[SMTP] Connection verify failed: ${err.message} (code=${err.code}, command=${err.command})`
    );

    if (err.code === "ETIMEDOUT" || err.message.includes("Timeout")) {
      throw new Error(
        `SMTP connection timed out to ${config.smtpHost}:${config.smtpPort}. ` +
          `Please verify: 1) Host/port are correct. 2) Firewall allows outbound on this port. ` +
          `3) For 163/QQ mail, you must use the "authorization code" (not login password). ` +
          `4) Port 465 needs secure=true; port 587 needs secure=false with STARTTLS.`
      );
    }
    if (err.message.includes("Invalid login") || err.message.includes("AUTH")) {
      throw new Error(
        `SMTP authentication failed. For 163/QQ mail, use the "authorization code" (授权码) instead of your login password.`
      );
    }
    throw err;
  }

  transporter = t;
  cachedConfigHash = cfgHash;
  return transporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<void> {
  const t = await buildTransporter();
  if (!t) {
    throw new Error("SMTP not configured");
  }

  const config = await resolveSmtpConfig();
  const info = await t.sendMail({
    from: `"EcoCtrl" <${config?.smtpUser}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  console.log(`[SMTP] Message sent: ${info.messageId}`);
}
