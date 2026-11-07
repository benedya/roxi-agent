import { EntitySchema } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";
import type { AssignmentEntity } from "#core/entities/assignment.entity";

/** One question or step of an assignment, sent to the assignee in position order. */
export interface AssignmentItemEntity {
  id: number;
  assignmentId: number;
  assignment?: AssignmentEntity;
  /** 1-based order within the assignment. */
  position: number;
  prompt: string;
  /** Null when any answer is accepted; such items are not graded. */
  expectedAnswer: string | null;
  /** Null until answered. */
  answer: string | null;
  /** Null until answered, and for items without an expected answer. */
  isCorrect: boolean | null;
  /** The bot's message that sent the prompt; null until sent. */
  promptMessageId: string | null;
  answeredAt: Date | null;
}

export const AssignmentItemEntitySchema = new EntitySchema<AssignmentItemEntity>({
  name: "AssignmentItem",
  tableName: "assignment_items",
  schema: APP_SCHEMA,
  columns: {
    id: { type: "integer", primary: true, generated: "increment" },
    assignmentId: { type: "integer", name: "assignment_id" },
    position: { type: "integer" },
    prompt: { type: "text" },
    expectedAnswer: { type: "text", name: "expected_answer", nullable: true },
    answer: { type: "text", nullable: true },
    isCorrect: { type: "boolean", name: "is_correct", nullable: true },
    promptMessageId: { type: "bigint", name: "prompt_message_id", nullable: true },
    answeredAt: { type: "timestamptz", name: "answered_at", nullable: true },
  },
  relations: {
    assignment: {
      type: "many-to-one",
      target: "Assignment",
      onDelete: "CASCADE",
      joinColumn: { name: "assignment_id", foreignKeyConstraintName: "assignment_items_assignment_id_fkey" },
    },
  },
  uniques: [{ name: "assignment_items_assignment_id_position_key", columns: ["assignmentId", "position"] }],
  checks: [{ name: "assignment_items_answered_check", expression: `(answer IS NULL) = (answered_at IS NULL)` }],
});
