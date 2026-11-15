import type { MigrationInterface, QueryRunner } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";

export class AddReminders1795100000000 implements MigrationInterface {
  name = "AddReminders1795100000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    // An IANA zone name (Europe/Kyiv), validated by the app; null until an admin sets it.
    await queryRunner.query(`ALTER TABLE ${APP_SCHEMA}.groups ADD COLUMN timezone text`);

    await queryRunner.query(`CREATE TYPE ${APP_SCHEMA}.reminder_status AS ENUM ('pending', 'sent', 'cancelled', 'failed')`);

    // dtstart is the local wall time ("2026-11-16T09:00") in the group's time zone, kept as text so
    // neither the driver nor the server's zone shifts it. Null for relative reminders ("in 2 hours").
    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.reminders (
        id                   integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        group_id             integer     NOT NULL,
        creator_user_id      integer     NOT NULL,
        text                 text        NOT NULL,
        rrule                text,
        dtstart              text,
        due_at               timestamptz NOT NULL,
        status               ${APP_SCHEMA}.reminder_status NOT NULL DEFAULT 'pending',
        source_message_id    bigint      NOT NULL,
        last_sent_message_id bigint,
        created_at           timestamptz NOT NULL DEFAULT now(),
        cancelled_at         timestamptz,
        CONSTRAINT reminders_group_id_fkey FOREIGN KEY (group_id) REFERENCES ${APP_SCHEMA}.groups (id) ON DELETE CASCADE,
        CONSTRAINT reminders_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES ${APP_SCHEMA}.users (id) ON DELETE CASCADE,
        CONSTRAINT reminders_text_not_empty_check CHECK (char_length(text) > 0),
        CONSTRAINT reminders_dtstart_format_check CHECK (dtstart IS NULL OR dtstart ~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$'),
        CONSTRAINT reminders_rrule_dtstart_check CHECK (rrule IS NULL OR dtstart IS NOT NULL),
        CONSTRAINT reminders_cancelled_at_check CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX reminders_pending_due_at_idx ON ${APP_SCHEMA}.reminders (due_at) WHERE status = 'pending'`,
    );
    await queryRunner.query(`CREATE INDEX reminders_group_id_idx ON ${APP_SCHEMA}.reminders (group_id)`);
    await queryRunner.query(`CREATE INDEX reminders_creator_user_id_idx ON ${APP_SCHEMA}.reminders (creator_user_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.reminders`);
    await queryRunner.query(`DROP TYPE ${APP_SCHEMA}.reminder_status`);
    await queryRunner.query(`ALTER TABLE ${APP_SCHEMA}.groups DROP COLUMN timezone`);
  }
}
