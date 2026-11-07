/** Telegram identity of a message sender. */
export type TelegramProfile = {
  telegramId: string;
  username?: string;
  firstName?: string;
};

export type GroupChatType = "group" | "supergroup";

/** A bot message to any chat; private chats use the user's Telegram id as the chat id. */
export type TelegramOutgoingMessage = {
  chatId: string;
  text: string;
  replyToMessageId?: string;
};

/** Unreachable: the user never started the bot or blocked it, or the bot is no longer in the chat. */
export type TelegramSendResult = { status: "sent"; messageId: string } | { status: "unreachable" };

/** Sends bot messages to any chat, not only the chat of the current inbound message. */
export type TelegramSender = {
  send(message: TelegramOutgoingMessage): Promise<TelegramSendResult>;
};

/** A Telegram group chat the bot was added to. */
export type TelegramChat = {
  chatId: string;
  title: string | null;
  type: GroupChatType;
};
