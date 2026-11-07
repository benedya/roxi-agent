import { telegramChannel } from "eve/channels/telegram";
import { resolve } from "#lib/container";
import { env } from "#lib/env";
import { LOGGER, type Logger } from "#lib/logger";
import { shareSessionPerGroup } from "#lib/telegram/group-session";
import { TelegramGateway } from "#lib/telegram/telegram.gateway";
import { TelegramMessageHandler } from "#lib/telegram/telegram-message.handler";

export default shareSessionPerGroup(
  telegramChannel({
    botUsername: env.TELEGRAM_BOT_USERNAME,
    credentials: { botToken: () => env.TELEGRAM_BOT_TOKEN },
    // A group shares one session: one member's message must not interrupt another member's turn.
    turnPolicy: "queue",

    async onMessage(ctx, message) {
      const handler = await resolve(TelegramMessageHandler);
      const logger = await resolve<Logger>(LOGGER);

      return handler.handle(message, new TelegramGateway(ctx, message, logger.child({ module: "TelegramGateway" })));
    },
  }),
);
