import type { MigrationInterface, QueryRunner } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";

export class InitSchema1792826913000 implements MigrationInterface {
  name = "InitSchema1792826913000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS ${APP_SCHEMA}`);

    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.users (
        id              integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        telegram_id     bigint      NOT NULL,
        username        text,
        first_name      text,
        created_at      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_telegram_id_key UNIQUE (telegram_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.groups (
        id               integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name             text        NOT NULL,
        settings         jsonb       NOT NULL DEFAULT '{}'::jsonb,
        created_at       timestamptz NOT NULL DEFAULT now(),
        telegram_chat_id bigint,
        chat_title       text,
        chat_type        text,
        linked_at        timestamptz,
        custom_instructions text,
        CONSTRAINT groups_telegram_chat_id_key UNIQUE (telegram_chat_id),
        CONSTRAINT groups_chat_type_check CHECK (chat_type IN ('group', 'supergroup')),
        -- A linked chat has all of its fields; an unlinked group has none.
        CONSTRAINT groups_chat_linked_check CHECK (
          (telegram_chat_id IS NULL) = (chat_type IS NULL) AND (telegram_chat_id IS NULL) = (linked_at IS NULL)
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.group_members (
        id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        group_id    integer     NOT NULL,
        user_id     integer     NOT NULL,
        is_admin    boolean     NOT NULL DEFAULT false,
        created_at  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES ${APP_SCHEMA}.groups (id) ON DELETE CASCADE,
        CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES ${APP_SCHEMA}.users (id) ON DELETE CASCADE,
        CONSTRAINT group_members_group_id_user_id_key UNIQUE (group_id, user_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX group_members_user_id_idx ON ${APP_SCHEMA}.group_members (user_id)`);

    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.notes (
        id              integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        group_id        integer     NOT NULL,
        author_user_id  integer,
        content         text        NOT NULL,
        summary         text,
        content_length  integer     GENERATED ALWAYS AS (char_length(content)) STORED,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notes_group_id_fkey FOREIGN KEY (group_id) REFERENCES ${APP_SCHEMA}.groups (id) ON DELETE CASCADE,
        -- The note stays with the group when its author is removed.
        CONSTRAINT notes_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES ${APP_SCHEMA}.users (id) ON DELETE SET NULL,
        CONSTRAINT notes_content_not_empty_check CHECK (content_length > 0),
        CONSTRAINT notes_summary_length_check CHECK (summary IS NULL OR char_length(summary) <= 100),
        -- Notes over 100 chars appear in the agent's notes index only as a summary.
        CONSTRAINT notes_summary_required_check CHECK (content_length <= 100 OR summary IS NOT NULL)
      )
    `);
    await queryRunner.query(`CREATE INDEX notes_group_id_created_at_idx ON ${APP_SCHEMA}.notes (group_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX notes_author_user_id_idx ON ${APP_SCHEMA}.notes (author_user_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.notes`);
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.group_members`);
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.groups`);
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.users`);
  }
}
