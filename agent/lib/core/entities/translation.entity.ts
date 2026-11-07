import { EntitySchema } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";

/** A fixed bot text in one language; sourceHash tells whether its English source has changed since. */
export interface TranslationEntity {
  id: number;
  messageKey: string;
  language: string;
  text: string;
  sourceHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TranslationEntitySchema = new EntitySchema<TranslationEntity>({
  name: "Translation",
  tableName: "translations",
  schema: APP_SCHEMA,
  columns: {
    id: { type: "integer", primary: true, generated: "increment" },
    messageKey: { type: "text", name: "message_key" },
    language: { type: "text" },
    text: { type: "text" },
    sourceHash: { type: "text", name: "source_hash" },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    updatedAt: { type: "timestamptz", name: "updated_at", updateDate: true },
  },
  uniques: [{ name: "translations_message_key_language_key", columns: ["messageKey", "language"] }],
});
