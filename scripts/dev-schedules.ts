// Local-dev cron: `eve dev` never fires schedules on its own, so this triggers them through the dev server's
// one-shot dispatch route (POST /eve/v1/dev/schedules/:id) at the start of every minute.
// It fires each listed schedule every minute, so list only schedules whose cron is "* * * * *".
// Production builds (`eve start`, Vercel) run schedules themselves and don't need it.
//
// Usage: npm run dev:schedules   (with `eve dev` running)
// Env:   DEV_SCHEDULES (comma-separated schedule ids, default "reminders"),
//        EVE_URL (default http://127.0.0.1:2000)

export {};

const eveUrl = (process.env.EVE_URL ?? "http://127.0.0.1:2000").replace(/\/$/, "");
const scheduleIds = (process.env.DEV_SCHEDULES ?? "reminders")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id !== "");

async function fire(scheduleId: string): Promise<void> {
  try {
    const response = await fetch(`${eveUrl}/eve/v1/dev/schedules/${encodeURIComponent(scheduleId)}`, { method: "POST" });

    if (!response.ok) {
      console.error(`Schedule "${scheduleId}" failed: HTTP ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error(`Schedule "${scheduleId}" failed:`, error instanceof Error ? error.message : error);
  }
}

/** Milliseconds until a second past the next minute, so runs line up with cron's minute boundaries. */
function untilNextMinute(): number {
  return 60_000 - (Date.now() % 60_000) + 1_000;
}

console.log(`Firing schedules every minute: ${scheduleIds.join(", ")} (${eveUrl})`);

for (;;) {
  await new Promise((resolve) => setTimeout(resolve, untilNextMinute()));
  await Promise.all(scheduleIds.map(fire));
}
