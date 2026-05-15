import pino from "pino";
import type { Logger, LoggerOptions } from "pino";
import pinoPretty from "pino-pretty";
import { createStream } from "rotating-file-stream";
import { Writable } from "node:stream";

const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV === "development";

const redactPaths = [
  "req.headers.authorization",
  "*.password",
  "req.body.password",
  "*.token",
  "req.body.token",
  "*.refreshToken",
  "req.body.refreshToken",
];

// TeeStream: writes to multiple streams simultaneously
class TeeStream extends Writable {
  constructor(private streams: Writable[]) {
    super();
  }

  _write(chunk: unknown, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    let pending = this.streams.length;
    if (pending === 0) {
      callback();
      return;
    }
    let firstError: Error | null = null;
    for (const stream of this.streams) {
      stream.write(chunk, encoding, (err) => {
        if (err && !firstError) firstError = err;
        if (--pending === 0) callback(firstError);
      });
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    let pending = this.streams.length;
    if (pending === 0) {
      callback();
      return;
    }
    let firstError: Error | null = null;
    for (const stream of this.streams) {
      stream.end(() => {
        if (--pending === 0) callback(firstError);
      });
    }
  }
}

function buildRootLogger(): Logger {
  const LOG_LEVEL = process.env.LOG_LEVEL || (isDev ? "debug" : "info");
  const LOG_DESTINATION = process.env.LOG_DESTINATION || (isDev ? "stdout" : "both");
  const LOG_DIR = process.env.LOG_DIR || "./logs";
  const LOG_PRETTY = process.env.LOG_PRETTY !== "false";
  const LOG_ROTATE_INTERVAL = process.env.LOG_ROTATE_INTERVAL || "1d";
  const LOG_MAX_DAYS = parseInt(process.env.LOG_MAX_DAYS || "30", 10);

  function createFileStream(filename: string) {
    return createStream(filename, {
      interval: LOG_ROTATE_INTERVAL,
      path: LOG_DIR,
      maxFiles: LOG_MAX_DAYS,
    });
  }

  const baseOptions: LoggerOptions = {
    level: LOG_LEVEL,
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]",
    },
  };

  // stdout only mode
  if (LOG_DESTINATION === "stdout") {
    if (isDev && LOG_PRETTY) {
      return pino(
        baseOptions,
        pinoPretty({
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        }),
      );
    }
    return pino(baseOptions);
  }

  // File streams
  const appStream = createFileStream("app.log");
  const errorStream = createFileStream("error.log");

  // Main output: app.log + optional stdout
  const mainStreams: Writable[] = [appStream];
  if (LOG_DESTINATION === "both") {
    if (isDev && LOG_PRETTY) {
      mainStreams.unshift(
        pinoPretty({
          colorize: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        }),
      );
    } else {
      mainStreams.unshift(process.stdout);
    }
  }

  const mainDest = mainStreams.length === 1 ? mainStreams[0] : new TeeStream(mainStreams);

  // Error logger writes to error.log only
  const errorLogger = pino({ ...baseOptions, level: "error" }, errorStream);

  // Hooks: duplicate error/fatal to error.log
  return pino(
    {
      ...baseOptions,
      hooks: {
        logMethod(args, method, level) {
          if (level >= 50) {
            // 50 = error, 60 = fatal
            const errorMethod = level >= 60 ? errorLogger.fatal : errorLogger.error;
            errorMethod.apply(errorLogger, args);
          }
          return method.apply(this, args);
        },
      },
    },
    mainDest,
  );
}

let _rootLogger: Logger | null = null;

export function getRootLogger(): Logger {
  if (!_rootLogger) {
    _rootLogger = buildRootLogger();
  }
  return _rootLogger;
}

export function getLogger(module: string): Logger {
  return getRootLogger().child({ module });
}
