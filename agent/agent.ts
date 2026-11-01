import { defineAgent } from "eve";
import { createModel } from "./lib/helpers/model.ts";
import { env } from "./lib/env.ts";

export default defineAgent({
  // Calls the provider directly, with the agent's own API key.
  model: createModel(env.AGENT_MODEL_PROVIDER, env.AGENT_MODEL, env.AGENT_MODEL_API_KEY),
  experimental: {
    workflow: {
      // Sessions live in Postgres (docker-compose.yml); reads DATABASE_URL (lib/env.ts).
      world: "@workflow/world-postgres",
    },
  },
});
