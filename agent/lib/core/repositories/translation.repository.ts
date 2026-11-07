import type { EntityManager } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";
import { TranslationEntitySchema, type TranslationEntity } from "#core/entities/translation.entity";

export class TranslationRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  findByKeyAndLanguage(messageKey: string, language: string): Promise<TranslationEntity | null> {
    return this.manager.findOneBy(TranslationEntitySchema, { messageKey, language });
  }

  /** Inserts the translation or replaces the outdated one; of two concurrent saves, the last one stays. */
  async upsert(translation: { messageKey: string; language: string; text: string; sourceHash: string }): Promise<void> {
    await this.manager.query(
      `INSERT INTO ${APP_SCHEMA}.translations (message_key, language, text, source_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (message_key, language) DO UPDATE SET
         text = EXCLUDED.text,
         source_hash = EXCLUDED.source_hash,
         updated_at = now()`,
      [translation.messageKey, translation.language, translation.text, translation.sourceHash],
    );
  }
}
