// Application logger (pino). Writes JSON lines to stdout, which eve passes through
// to `eve dev`, .eve/logs and the hosting platform's logs.
//
// Env: LOG_LEVEL   trace | debug | info (default) | warn | error | fatal | silent
//      LOG_PRETTY  "true" for human-readable output in local dev (pino-pretty, dev dependency)

import { pino, type Logger } from "pino";
import { env } from "./env.ts";

export type { Logger };

/** Container token for the root logger; services receive `logger.child({ module })`. */
export const LOGGER = Symbol.for("Logger");

export async function createLogger(): Promise<Logger> {
  const options = {
    level: env.LOG_LEVEL,
    base: { service: "roxi-agent" },
    redact: ["*.botToken", "*.token", "*.password"],
  };
  if (!env.LOG_PRETTY) {
    return pino(options);
  }
  const { default: pretty } = await import("pino-pretty");
  return pino(options, pretty({ colorize: true, ignore: "pid,hostname,service", translateTime: "HH:MM:ss.l" }));
}
