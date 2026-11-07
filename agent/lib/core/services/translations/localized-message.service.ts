import { createHash } from "node:crypto";
import type { Logger } from "pino";
import { DEFAULT_LANGUAGE } from "#core/helpers/language";
import { MESSAGES, renderMessage, type MessageKey, type MessageParams } from "#core/helpers/messages";
import type { TranslationRepository } from "#core/repositories/translation.repository";
import type { MessageTranslatorService } from "#core/services/translations/message-translator.service";

/**
 * Gives the bot's fixed texts in a user's language. A translation is made on first use and stored;
 * it is made again when its English source changes. English is the fallback, so a failed
 * translation or lookup never stops a message from being sent.
 */
export class LocalizedMessageService {
  private readonly translationRepository: TranslationRepository;
  private readonly messageTranslatorService: MessageTranslatorService;
  private readonly logger: Logger;

  constructor(
    translationRepository: TranslationRepository,
    messageTranslatorService: MessageTranslatorService,
    logger: Logger,
  ) {
    this.translationRepository = translationRepository;
    this.messageTranslatorService = messageTranslatorService;
    this.logger = logger;
  }

  async getMessage(key: MessageKey, language: string | null, params?: MessageParams): Promise<string> {
    return renderMessage(await this.getTemplate(key, language), params);
  }

  /** The unrendered text, for messages that render the same template many times. */
  async getTemplate(key: MessageKey, language: string | null): Promise<string> {
    const source = MESSAGES[key];

    if (language === null || language === DEFAULT_LANGUAGE) {
      return source;
    }

    try {
      const sourceHash = createHash("sha256").update(source).digest("hex");
      const saved = await this.translationRepository.findByKeyAndLanguage(key, language);

      if (saved?.sourceHash === sourceHash) {
        return saved.text;
      }

      const text = await this.messageTranslatorService.translate(source, language);

      if (text === null) {
        return source;
      }

      await this.translationRepository.upsert({ messageKey: key, language, text, sourceHash });
      this.logger.info({ key, language }, "message translated");

      return text;
    } catch (error) {
      this.logger.error({ err: error, key, language }, "translation unavailable: using English");

      return source;
    }
  }
}
