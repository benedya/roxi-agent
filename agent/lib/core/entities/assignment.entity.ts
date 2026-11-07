import { EntitySchema } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";
import type { GroupEntity } from "#core/entities/group.entity";
import type { UserEntity } from "#core/entities/user.entity";

// A const object rather than a TS enum: scripts run under Node's type stripping, which has no enums.
export const AssignmentStatus = {
  Open: "open",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

/**
 * A list of items one group member gave another: the bot sends the items to the assignee
 * one by one in a private chat and posts the result in the group. An assignee has at most one open assignment.
 */
export interface AssignmentEntity {
  id: number;
  groupId: number;
  group?: GroupEntity;
  assignerUserId: number;
  assigner?: UserEntity;
  assigneeUserId: number;
  assignee?: UserEntity;
  title: string;
  status: AssignmentStatus;
  /** The group message that asked for the assignment; the result replies to it. */
  sourceMessageId: string;
  createdAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
}

export const AssignmentEntitySchema = new EntitySchema<AssignmentEntity>({
  name: "Assignment",
  tableName: "assignments",
  schema: APP_SCHEMA,
  columns: {
    id: { type: "integer", primary: true, generated: "increment" },
    groupId: { type: "integer", name: "group_id" },
    assignerUserId: { type: "integer", name: "assigner_user_id" },
    assigneeUserId: { type: "integer", name: "assignee_user_id" },
    title: { type: "text" },
    status: {
      type: "enum",
      enum: Object.values(AssignmentStatus),
      enumName: "assignment_status",
      default: AssignmentStatus.Open,
    },
    sourceMessageId: { type: "bigint", name: "source_message_id" },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
    completedAt: { type: "timestamptz", name: "completed_at", nullable: true },
    cancelledAt: { type: "timestamptz", name: "cancelled_at", nullable: true },
  },
  relations: {
    group: {
      type: "many-to-one",
      target: "Group",
      onDelete: "CASCADE",
      joinColumn: { name: "group_id", foreignKeyConstraintName: "assignments_group_id_fkey" },
    },
    assigner: {
      type: "many-to-one",
      target: "User",
      onDelete: "CASCADE",
      joinColumn: { name: "assigner_user_id", foreignKeyConstraintName: "assignments_assigner_user_id_fkey" },
    },
    assignee: {
      type: "many-to-one",
      target: "User",
      onDelete: "CASCADE",
      joinColumn: { name: "assignee_user_id", foreignKeyConstraintName: "assignments_assignee_user_id_fkey" },
    },
  },
  checks: [
    {
      name: "assignments_completed_at_check",
      expression: `(status = '${AssignmentStatus.Completed}') = (completed_at IS NOT NULL)`,
    },
    {
      name: "assignments_cancelled_at_check",
      expression: `(status = '${AssignmentStatus.Cancelled}') = (cancelled_at IS NOT NULL)`,
    },
  ],
  indices: [
    { name: "assignments_assignee_open_key", columns: ["assigneeUserId"], unique: true, where: `status = '${AssignmentStatus.Open}'` },
    { name: "assignments_assignee_user_id_idx", columns: ["assigneeUserId"] },
    { name: "assignments_group_id_idx", columns: ["groupId"] },
    { name: "assignments_assigner_user_id_idx", columns: ["assignerUserId"] },
  ],
});
