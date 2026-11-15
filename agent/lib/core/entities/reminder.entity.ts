import { EntitySchema } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";
import type { GroupEntity } from "#core/entities/group.entity";
import type { UserEntity } from "#core/entities/user.entity";

// A const object rather than a TS enum: scripts run under Node's type stripping, which has no enums.
export const ReminderStatus = {
  Pending: "pending",
  Sent: "sent",
  Cancelled: "cancelled",
  Failed: "failed",
} as const;

export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];

/**
 * A message the bot posts in a group at a set time, once or on a repeating RRULE.
 * Wall-clock times are read in the group's time zone, so changing it moves pending reminders with it.
 */
export interface ReminderEntity {
  id: number;
  groupId: number;
  group?: GroupEntity;
  creatorUserId: number;
  creator?: UserEntity;
  text: string;
  /** An RFC 5545 rule without DTSTART (FREQ=WEEKLY;BYDAY=MO); null for a one-time reminder. */
  rrule: string | null;
  /** Local wall time of the first run ("2026-11-16T09:00"); null for a relative reminder. */
  dtstart: string | null;
  /** The next run; the dispatcher sends pending reminders once it has passed. */
  dueAt: Date;
  status: ReminderStatus;
  /** The group message that asked for the reminder; each reminder replies to it. */
  sourceMessageId: string;
  lastSentMessageId: string | null;
  createdAt: Date;
  cancelledAt: Date | null;
}

export const ReminderEntitySchema = new EntitySchema<ReminderEntity>({
  name: "Reminder",
  tableName: "reminders",
  schema: APP_SCHEMA,
  columns: {
    id: { type: "integer", primary: true, generated: "increment" },
    groupId: { type: "integer", name: "group_id" },
    creatorUserId: { type: "integer", name: "creator_user_id" },
    text: { type: "text" },
    rrule: { type: "text", nullable: true },
    dtstart: { type: "text", nullable: true },
    dueAt: { type: "timestamptz", name: "due_at" },
    status: {
      type: "enum",
      enum: Object.values(ReminderStatus),
      enumName: "reminder_status",
      default: ReminderStatus.Pending,
    },
    sourceMessageId: { type: "bigint", name: "source_message_id" },
    lastSentMessageId: { type: "bigint", name: "last_sent_message_id", nullable: true },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    cancelledAt: { type: "timestamptz", name: "cancelled_at", nullable: true },
  },
  relations: {
    group: {
      type: "many-to-one",
      target: "Group",
      onDelete: "CASCADE",
      joinColumn: { name: "group_id", foreignKeyConstraintName: "reminders_group_id_fkey" },
    },
    creator: {
      type: "many-to-one",
      target: "User",
      onDelete: "CASCADE",
      joinColumn: { name: "creator_user_id", foreignKeyConstraintName: "reminders_creator_user_id_fkey" },
    },
  },
  checks: [
    { name: "reminders_text_not_empty_check", expression: `char_length(text) > 0` },
    {
      name: "reminders_dtstart_format_check",
      expression: `dtstart IS NULL OR dtstart ~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$'`,
    },
    { name: "reminders_rrule_dtstart_check", expression: `rrule IS NULL OR dtstart IS NOT NULL` },
    {
      name: "reminders_cancelled_at_check",
      expression: `(status = '${ReminderStatus.Cancelled}') = (cancelled_at IS NOT NULL)`,
    },
  ],
  indices: [
    { name: "reminders_pending_due_at_idx", columns: ["dueAt"], where: `status = '${ReminderStatus.Pending}'` },
    { name: "reminders_group_id_idx", columns: ["groupId"] },
    { name: "reminders_creator_user_id_idx", columns: ["creatorUserId"] },
  ],
});
