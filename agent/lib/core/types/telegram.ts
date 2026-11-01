/** Telegram identity of a message sender. */
export type TelegramProfile = {
  telegramId: string;
  username?: string;
  firstName?: string;
};

export type GroupChatType = "group" | "supergroup";

/** A Telegram group chat the bot was added to. */
export type TelegramChat = {
  chatId: string;
  title: string | null;
  type: GroupChatType;
};
