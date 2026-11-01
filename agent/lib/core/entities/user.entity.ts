import { EntitySchema } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";

export interface UserEntity {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  createdAt: Date;
}

export const UserEntitySchema = new EntitySchema<UserEntity>({
  name: "User",
  tableName: "users",
  schema: APP_SCHEMA,
  columns: {
    id: { type: "integer", primary: true, generated: "increment" },
    telegramId: { type: "bigint", name: "telegram_id", unique: true },
    username: { type: "text", nullable: true },
    firstName: { type: "text", name: "first_name", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
  },
});
