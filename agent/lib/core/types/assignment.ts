import type { AssignmentEntity } from "#core/entities/assignment.entity";
import type { GroupEntity } from "#core/entities/group.entity";
import type { UserEntity } from "#core/entities/user.entity";

/** An assignment with the group and users needed to message them. */
export type AssignmentWithParticipants = AssignmentEntity & {
  group: GroupEntity;
  assignee: UserEntity;
  assigner: UserEntity;
};

/** An item as the agent writes it; a null expected answer means any answer is accepted. */
export type AssignmentItemInput = {
  prompt: string;
  expectedAnswer: string | null;
};

/** A group member's request to give another member an assignment. */
export type CreateAssignmentInput = {
  groupId: number;
  assignerTelegramId: string;
  /** The assignee as the requester named them: @username or first name. */
  assignee: string;
  title: string;
  items: AssignmentItemInput[];
  /** The group message that asked for the assignment. */
  sourceMessageId: string;
};

/**
 * Outcome of creating an assignment: only members of the group can get one, at most one open at a time,
 * and only when the bot can message them privately (they have started the bot).
 */
export type CreateAssignmentResult =
  | { status: "created"; assigneeName: string; itemCount: number }
  | { status: "not_member" }
  | { status: "ambiguous_assignee"; candidates: string[] }
  | { status: "assignee_busy"; assigneeName: string }
  | { status: "assignee_unreachable"; assigneeName: string };

/**
 * Outcome of a private message from an assignee: an answer to the current item, the answer that
 * completed the assignment, or a message that doesn't count (not text, or sent before the current item).
 */
export type RecordAnswerResult = "no_open_assignment" | "ignored" | "recorded" | "completed";
