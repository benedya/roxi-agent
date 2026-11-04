import type { MigrationInterface, QueryRunner } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";

export class AddAssignments1793696400000 implements MigrationInterface {
  name = "AddAssignments1793696400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE ${APP_SCHEMA}.assignment_status AS ENUM ('open', 'completed')`);

    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.assignments (
        id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        group_id          integer     NOT NULL,
        assigner_user_id  integer     NOT NULL,
        assignee_user_id  integer     NOT NULL,
        title             text        NOT NULL,
        status            ${APP_SCHEMA}.assignment_status NOT NULL DEFAULT 'open',
        source_message_id bigint      NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        completed_at      timestamptz,
        CONSTRAINT assignments_group_id_fkey FOREIGN KEY (group_id) REFERENCES ${APP_SCHEMA}.groups (id) ON DELETE CASCADE,
        CONSTRAINT assignments_assigner_user_id_fkey FOREIGN KEY (assigner_user_id) REFERENCES ${APP_SCHEMA}.users (id) ON DELETE CASCADE,
        CONSTRAINT assignments_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES ${APP_SCHEMA}.users (id) ON DELETE CASCADE,
        CONSTRAINT assignments_completed_at_check CHECK ((status = 'completed') = (completed_at IS NOT NULL))
      )
    `);
    // At most one open assignment per assignee: their private chat answers only that one.
    await queryRunner.query(
      `CREATE UNIQUE INDEX assignments_assignee_open_key ON ${APP_SCHEMA}.assignments (assignee_user_id) WHERE status = 'open'`,
    );
    await queryRunner.query(`CREATE INDEX assignments_assignee_user_id_idx ON ${APP_SCHEMA}.assignments (assignee_user_id)`);
    await queryRunner.query(`CREATE INDEX assignments_group_id_idx ON ${APP_SCHEMA}.assignments (group_id)`);
    await queryRunner.query(`CREATE INDEX assignments_assigner_user_id_idx ON ${APP_SCHEMA}.assignments (assigner_user_id)`);

    await queryRunner.query(`
      CREATE TABLE ${APP_SCHEMA}.assignment_items (
        id                integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        assignment_id     integer     NOT NULL,
        position          integer     NOT NULL,
        prompt            text        NOT NULL,
        expected_answer   text,
        answer            text,
        is_correct        boolean,
        prompt_message_id bigint,
        answered_at       timestamptz,
        CONSTRAINT assignment_items_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES ${APP_SCHEMA}.assignments (id) ON DELETE CASCADE,
        CONSTRAINT assignment_items_assignment_id_position_key UNIQUE (assignment_id, position),
        CONSTRAINT assignment_items_answered_check CHECK ((answer IS NULL) = (answered_at IS NULL))
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.assignment_items`);
    await queryRunner.query(`DROP TABLE ${APP_SCHEMA}.assignments`);
    await queryRunner.query(`DROP TYPE ${APP_SCHEMA}.assignment_status`);
  }
}
