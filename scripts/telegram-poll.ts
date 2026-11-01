// Local-dev relay: long-polls Telegram getUpdates and forwards each update to
// the eve Telegram webhook route, so `eve dev` works without a public URL.
//
// Usage: npm run telegram:poll   (with `eve dev` running)
// Env:   TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET_TOKEN (from .env.local),
//        EVE_URL (default http://127.0.0.1:2000)

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // Fall back to the existing environment.
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
const eveUrl = (process.env.EVE_URL ?? "http://127.0.0.1:2000").replace(/\/$/, "");
const webhookUrl = `${eveUrl}/eve/v1/telegram`;
const pollTimeoutSeconds = 30;

if (!botToken || !secretToken) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET_TOKEN must be set.");
  process.exit(1);
}

const telegramApi = `https://api.telegram.org/bot${botToken}`;

type TelegramUpdate = { update_id: number };
type TelegramResponse<T> = { ok: boolean; result: T; description?: string };

async function callTelegram<T>(method: string, body: object, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${telegramApi}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await response.json()) as TelegramResponse<T>;
  if (!data.ok) {
    throw new Error(`${method} failed: ${data.description ?? response.status}`);
  }
  return data.result;
}

async function forward(update: TelegramUpdate): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Bot-Api-Secret-Token": secretToken!,
    },
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    console.error(`update ${update.update_id}: eve responded ${response.status} ${await response.text()}`);
  } else {
    console.log(`update ${update.update_id}: forwarded`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const controller = new AbortController();
process.on("SIGINT", () => {
  console.log("\nStopping.");
  controller.abort();
  process.exit(0);
});

// getUpdates is refused while a webhook is registered.
await callTelegram("deleteWebhook", { drop_pending_updates: false });
console.log(`Polling Telegram, forwarding to ${webhookUrl}`);

let offset = 0;
while (!controller.signal.aborted) {
  try {
    const updates = await callTelegram<TelegramUpdate[]>(
      "getUpdates",
      { offset, timeout: pollTimeoutSeconds, allowed_updates: ["message", "callback_query"] },
      controller.signal,
    );
    for (const update of updates) {
      // Advance the offset even if forwarding fails, so one bad update can't block the loop.
      offset = update.update_id + 1;
      try {
        await forward(update);
      } catch (error) {
        console.error(`update ${update.update_id}: could not reach eve at ${webhookUrl}:`, (error as Error).message);
      }
    }
  } catch (error) {
    if (controller.signal.aborted) {
      break;
    }
    console.error("getUpdates error:", (error as Error).message);
    await sleep(3000);
  }
}
