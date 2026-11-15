// Ends every active agent session, so the next message to each chat starts a fresh session on the current code.
// Dev only: under eve dev with @workflow/world-postgres, a session keeps running the code snapshot it started
// with, so code changes don't reach existing chats. Each chat's conversation history is dropped; app data stays.
//
// Usage: make reset-sessions (runs inside the agent container)
// Env:   DATABASE_URL, EVE_URL (optional, default http://127.0.0.1:2000)

import pg from "pg";

const eveUrl = process.env.EVE_URL ?? "http://127.0.0.1:2000";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

try {
  // eve's own tables (workflow schema): a live session is a running workflowEntry run of type "session".
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM workflow.workflow_runs
      WHERE name = 'workflow//eve//workflowEntry' AND status = 'running' AND attributes->>'$eve.type' = 'session'
      ORDER BY created_at`,
  );

  if (rows.length === 0) {
    console.log("No active sessions.");
  }

  let failed = 0;

  for (const { id } of rows) {
    const response = await fetch(`${eveUrl}/eve/v1/session/${id}/reset`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Pick up new code" }),
    });

    if (response.ok) {
      console.log(`Reset ${id}`);
    } else {
      failed++;
      console.error(`Failed to reset ${id}: HTTP ${response.status} ${await response.text()}`);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
