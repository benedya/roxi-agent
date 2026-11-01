// Environment variables for the agent runtime, validated once on import so a missing
// or invalid value stops the app at startup with every problem listed together.
// Scripts (scripts/*.ts) check their own variables: they need only a few of these.

import { z } from "zod";
import { MODEL_PROVIDERS } from "./helpers/model.ts";

const EnvSchema = z.object({
  // Each model use has its own provider and key, so usage and limits stay separate.
  AGENT_MODEL_PROVIDER: z.enum(MODEL_PROVIDERS),
  AGENT_MODEL: z.string().min(1),
  AGENT_MODEL_API_KEY: z.string().min(1),
  NOTE_SUMMARY_MODEL_PROVIDER: z.enum(MODEL_PROVIDERS),
  NOTE_SUMMARY_MODEL: z.string().min(1),
  NOTE_SUMMARY_MODEL_API_KEY: z.string().min(1),

  TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),

  // One database for the app tables and eve's sessions: @workflow/world-postgres falls back to
  // DATABASE_URL when WORKFLOW_POSTGRES_URL is unset.
  DATABASE_URL: z.string().min(1),

  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  LOG_PRETTY: z.stringbool().default(false),
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const message = `Invalid environment variables:\n${z.prettifyError(result.error)}`;
    // eve reports a failing agent.ts with a generic "Failed to evaluate authored module" and
    // keeps this error only as its cause, so print it first; the logger needs env and can't be used.
    console.error(message);
    throw new Error(message);
  }
  return result.data;
}

export const env = parseEnv();
