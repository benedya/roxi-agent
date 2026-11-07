import { normalizeLanguageCode } from "#core/helpers/language";
import type { UserRepository } from "#core/repositories/user.repository";

/** Keeps a known user's saved language in step with their Telegram app, for messages sent to them later. */
export class RecordUserLanguageService {
  private readonly userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async record(telegramId: string, languageCode: string | undefined): Promise<void> {
    const language = normalizeLanguageCode(languageCode);

    if (language !== null) {
      await this.userRepository.updateLanguage(telegramId, language);
    }
  }
}
