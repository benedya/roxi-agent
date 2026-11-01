import { telegramChannel } from "eve/channels/telegram";
import { resolve } from "../lib/container.ts";
import { env } from "../lib/env.ts";
import { LOGGER, type Logger } from "../lib/logger.ts";
import { TelegramGateway } from "../lib/telegram/telegram.gateway.ts";
import { TelegramMessageHandler } from "../lib/telegram/telegram-message.handler.ts";

export default telegramChannel({
  botUsername: env.TELEGRAM_BOT_USERNAME,
  credentials: { botToken: () => env.TELEGRAM_BOT_TOKEN },

  async onMessage(ctx, message) {
    const handler = await resolve(TelegramMessageHandler);
    const logger = await resolve<Logger>(LOGGER);

    return handler.handle(message, new TelegramGateway(ctx, message, logger.child({ module: "TelegramGateway" })));
  },
});
