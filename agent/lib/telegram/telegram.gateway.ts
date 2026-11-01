import type { TelegramContext, TelegramMessage } from "eve/channels/telegram";
import type { Logger } from "../logger.ts";

/**
 * Bot API calls for one inbound message. Created per message (it wraps that
 * message's eve context), so it is not registered in the container.
 */
export class TelegramGateway {
  // Static: gateways are per message, but getMe's answer holds for the process.
  private static fetchedUsername: Promise<string | undefined> | undefined;

  private readonly ctx: TelegramContext;
  private readonly message: TelegramMessage;
  private readonly logger: Logger;

  constructor(ctx: TelegramContext, message: TelegramMessage, logger: Logger) {
    this.ctx = ctx;
    this.message = message;
    this.logger = logger;
  }

  /** The bot's @username: from configuration, or from one cached getMe call. */
  async resolveBotUsername(): Promise<string | undefined> {
    const configured = this.ctx.telegram.botUsername;
    if (configured) {
      return configured;
    }

    TelegramGateway.fetchedUsername ??= this.fetchBotUsername().then((username) => {
      if (!username) {
        this.logger.warn("getMe returned no username; @mentions are not detected until it succeeds");
        TelegramGateway.fetchedUsername = undefined; // retry on the next message
      }
      return username;
    });
    return TelegramGateway.fetchedUsername;
  }

  async reply(text: string): Promise<void> {
    await this.ctx.telegram.post({ text, reply_parameters: { message_id: Number(this.message.messageId) } });
  }

  async send(text: string): Promise<void> {
    await this.ctx.telegram.post({ text });
  }

  startTyping(): Promise<void> {
    return this.ctx.telegram.startTyping();
  }

  /** The bot's @username from getMe, or undefined when the call fails. */
  private async fetchBotUsername(): Promise<string | undefined> {
    const response = await this.ctx.telegram.request("getMe").catch(() => undefined);
    return (response?.body as { result?: { username?: string } } | undefined)?.result?.username;
  }
}
