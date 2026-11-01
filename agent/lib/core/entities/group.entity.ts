import { EntitySchema } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";
import type { GroupChatType } from "#core/types/telegram";

export interface GroupSettings {
  language?: string;
  timezone?: string;
  features?: string[];
}

export interface GroupEntity {
  id: number;
  name: string;
  settings: GroupSettings;
  createdAt: Date;
  /** The group's Telegram chat, set when the bot is added to it. */
  telegramChatId: string | null;
  chatTitle: string | null;
  chatType: GroupChatType | null;
  linkedAt: Date | null;
  /** Admin-written instructions that adjust the agent's behavior in this group's chat. */
  customInstructions: string | null;
}

export const GroupEntitySchema = new EntitySchema<GroupEntity>({
  name: "Group",
  tableName: "groups",
  schema: APP_SCHEMA,
  columns: {
    id: { type: "integer", primary: true, generated: "increment" },
    name: { type: "text" },
    settings: { type: "jsonb", default: {} },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    telegramChatId: { type: "bigint", name: "telegram_chat_id", nullable: true, unique: true },
    chatTitle: { type: "text", name: "chat_title", nullable: true },
    chatType: { type: "text", name: "chat_type", nullable: true },
    linkedAt: { type: "timestamptz", name: "linked_at", nullable: true },
    customInstructions: { type: "text", name: "custom_instructions", nullable: true },
  },
  checks: [
    { name: "groups_chat_type_check", expression: `chat_type IN ('group', 'supergroup')` },
    { name: "groups_chat_linked_check", expression: `(telegram_chat_id IS NULL) = (chat_type IS NULL) AND (telegram_chat_id IS NULL) = (linked_at IS NULL)` },
  ],
});
