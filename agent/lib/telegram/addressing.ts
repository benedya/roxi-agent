// Mirrors eve's default Telegram dispatch rule, which is not exported: private
// chats always go through; in groups only a command, an @mention of the bot,
// or a reply to one of the bot's messages does.

import type { TelegramMessage } from "eve/channels/telegram";

export function isAddressedToBot(message: TelegramMessage, botUsername: string | undefined): boolean {
  if (message.from?.isBot === true || message.chat.type === "channel") {
    return false;
  }

  const text = message.text || message.caption;
  if (text.trim().length === 0 && message.attachments.length === 0) {
    return false;
  }
  if (message.chat.type === "private") {
    return true;
  }
  if (message.replyToMessage?.from?.isBot === true) {
    return true;
  }

  const command = /^\/[A-Za-z0-9_]+(?:@(?<target>[A-Za-z0-9_]+))?(?:\s|$)/u.exec(text);
  if (command) {
    const target = command.groups?.target;
    return target === undefined || target.toLowerCase() === botUsername?.toLowerCase();
  }
  return botUsername !== undefined && text.toLowerCase().includes(`@${botUsername.toLowerCase()}`);
}
