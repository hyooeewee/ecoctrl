import { z } from "zod";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  JWT_SECRET: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_DESTINATION: z.enum(["stdout", "file", "both"]).default("stdout"),
  LOG_DIR: z.string().default("./logs"),
  LOG_PRETTY: z
    .string()
    .default("true")
    .transform((v) => v !== "false"),
  LOG_ROTATE_INTERVAL: z.string().default("1d"),
  LOG_MAX_DAYS: z.coerce.number().default(30),
  SMTP_HOST: z.string().default("smtp.163.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_APP_SECRET: z.string().optional(),
  FEISHU_APP_ID: z.string().optional(),
  FEISHU_APP_SECRET: z.string().optional(),
  OPENWEATHER_API_KEY: z.string().optional(),
  WEATHER_LAT: z.string().default("39.9042"),
  WEATHER_LNG: z.string().default("116.4074"),
  WEATHER_LOCATION: z.string().default("Beijing"),
  AI_PROVIDER: z.string().default("openai"),
  AI_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  BASE_URL: z.string().optional(),
  APP_ID: z.string().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["minio", "local"]).default("local"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET_FILES: z.string().default("ecoctrl-files"),
  S3_BUCKET_MODELS: z.string().default("ecoctrl-models"),
  S3_BUCKET_NODES: z.string().default("ecoctrl-nodes"),
  S3_BUCKET_PETS: z.string().default("ecoctrl-pets"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
});

let _parsed: z.infer<typeof envSchema> | null = null;

function ensureParsed() {
  if (!_parsed) {
    _parsed = envSchema.parse(process.env);
  }
}

export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop) {
    ensureParsed();
    return _parsed![prop as keyof z.infer<typeof envSchema>];
  },
});
