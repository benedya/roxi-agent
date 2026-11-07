import type { TelegramUser } from "eve/channels/telegram";
import { normalizeLanguageCode } from "#core/helpers/language";
import type { TelegramProfile } from "#core/types/telegram";

export function toTelegramProfile(user: TelegramUser): TelegramProfile {
  return {
    telegramId: user.id,
    username: user.username,
    firstName: user.firstName,
    languageCode: normalizeLanguageCode(user.languageCode) ?? undefined,
  };
}
