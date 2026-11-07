import { defineAgent } from "eve";
import { createModel } from "#lib/helpers/model";
import { env } from "#lib/env";

export default defineAgent({
  // Calls the provider directly, with the agent's own API key.
  model: createModel(env.AGENT_MODEL_PROVIDER, env.AGENT_MODEL, env.AGENT_MODEL_API_KEY),
  // A group's session holds its whole conversation, so it must not expire,
  // and compacting early keeps the history resent on each turn smaller.
  limits: { sessionTimeoutMs: false },
  compaction: { thresholdPercent: env.COMPACTION_THRESHOLD_PERCENT },
  experimental: {
    workflow: {
      // Sessions live in Postgres (docker-compose.yml); reads DATABASE_URL (lib/env.ts).
      world: "@workflow/world-postgres",
    },
  },
});
