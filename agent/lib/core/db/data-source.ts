// TypeORM DataSource for the group access tables (Postgres schema APP_SCHEMA, "roxi_agent" by default).
// eve's own session tables live in the same database under a different schema;
// synchronize stays off so TypeORM only changes what the migrations say.
// Entities are mapped with EntitySchema (no decorators). Telegram ids are bigint
// columns; pg returns them as strings, so they are typed as string.

import { DataSource } from "typeorm";
import { AssignmentEntitySchema } from "#core/entities/assignment.entity";
import { AssignmentItemEntitySchema } from "#core/entities/assignment-item.entity";
import { GroupEntitySchema } from "#core/entities/group.entity";
import { GroupMemberEntitySchema } from "#core/entities/group-member.entity";
import { NoteEntitySchema } from "#core/entities/note.entity";
import { TranslationEntitySchema } from "#core/entities/translation.entity";
import { UserEntitySchema } from "#core/entities/user.entity";
import { APP_SCHEMA } from "#core/db/schema";

export function createDataSource(url = process.env.DATABASE_URL): DataSource {
  if (!url) {
    throw new Error("DATABASE_URL must be set.");
  }
  return new DataSource({
    type: "postgres",
    url,
    schema: APP_SCHEMA,
    entities: [
      UserEntitySchema,
      GroupEntitySchema,
      GroupMemberEntitySchema,
      NoteEntitySchema,
      AssignmentEntitySchema,
      AssignmentItemEntitySchema,
      TranslationEntitySchema,
    ],
    migrations: [`${import.meta.dirname}/migrations/*.ts`],
    migrationsTableName: "migrations",
    synchronize: false,
  });
}

let initializing: Promise<DataSource> | undefined;

/** Shared, lazily initialized DataSource for runtime code (channels, tools). */
export function getDataSource(): Promise<DataSource> {
  initializing ??= createDataSource()
    .initialize()
    .catch((error: unknown) => {
      initializing = undefined;
      throw error;
    });
  return initializing;
}
