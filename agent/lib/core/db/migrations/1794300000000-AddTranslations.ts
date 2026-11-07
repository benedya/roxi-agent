import type { MigrationInterface, QueryRunner } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";

export class AddTranslations1794300000000 implements MigrationInterface {
  name = "AddTranslations1794300000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${APP_SCHEMA}.users ADD COLUMN language_code text`);

    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.translations (
        id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        message_key text        NOT NULL,
        language    text        NOT NULL,
        text        text        NOT NULL,
        source_hash text        NOT NULL,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT translations_message_key_language_key UNIQUE (message_key, language)
      )
    `);

    await queryRunner.query(`ALTER TABLE ${APP_SCHEMA}.groups DROP COLUMN settings`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${APP_SCHEMA}.groups ADD COLUMN settings jsonb NOT NULL DEFAULT '{}'::jsonb`);
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.translations`);
    await queryRunner.query(`ALTER TABLE ${APP_SCHEMA}.users DROP COLUMN language_code`);
  }
}
