// Bot API sends to any chat, for messages outside the chat of the current inbound message
// (TelegramGateway only answers in that chat): assignment items in a private chat, results in the group.

import { callTelegramApi, splitTelegramMessageText, type TelegramApiResponse } from "eve/channels/telegram";
import type { TelegramOutgoingMessage, TelegramSendResult, TelegramSender } from "#core/types/telegram";

type SendMessageBody = { ok?: boolean; description?: string; result?: { message_id?: number } };

export class TelegramBotApi implements TelegramSender {
  private readonly botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /** Splits text over Telegram's length cap; only the first part replies to replyToMessageId. */
  async send(message: TelegramOutgoingMessage): Promise<TelegramSendResult> {
    let firstMessageId: string | undefined;

    for (const text of splitTelegramMessageText(message.text)) {
      const response = await callTelegramApi({
        botToken: this.botToken,
        method: "sendMessage",
        body: {
          chat_id: message.chatId,
          text,
          ...(message.replyToMessageId && firstMessageId === undefined
            ? // Still posted, as a plain message, when the replied-to message was deleted.
              { reply_parameters: { message_id: Number(message.replyToMessageId), allow_sending_without_reply: true } }
            : {}),
        },
      });

      if (!response.ok) {
        if (this.isUnreachable(response)) {
          return { status: "unreachable" };
        }
        throw new Error(`Telegram sendMessage failed with HTTP ${response.status}: ${this.describe(response)}`);
      }

      firstMessageId ??= String((response.body as SendMessageBody).result?.message_id ?? "");
    }

    return { status: "sent", messageId: firstMessageId ?? "" };
  }

  /** 403: the user never started the bot or blocked it, or the bot was removed from the group; 400: no such chat. */
  private isUnreachable(response: TelegramApiResponse): boolean {
    return response.status === 403 || (response.status === 400 && /chat not found/i.test(this.describe(response)));
  }

  private describe(response: TelegramApiResponse): string {
    return (response.body as SendMessageBody | null)?.description ?? "no description";
  }
}
