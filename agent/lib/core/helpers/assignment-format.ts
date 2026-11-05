// Texts the bot sends for assignments: plain text, since Telegram messages go out without a parse_mode.

import type { AssignmentItemEntity } from "#core/entities/assignment-item.entity";
import type { GroupEntity } from "#core/entities/group.entity";
import type { UserEntity } from "#core/entities/user.entity";

export function formatUserName(user: UserEntity | null | undefined): string {
  if (!user) {
    return "Someone";
  }
  return user.username ? `@${user.username}` : (user.firstName ?? "Someone");
}

export function formatGroupName(group: GroupEntity): string {
  return group.chatTitle ?? group.name;
}

/** The private message that announces a new assignment, before its first item. */
export function formatAssignmentIntro(assignment: {
  assignerName: string;
  groupName: string;
  title: string;
  itemCount: number;
}): string {
  const items = assignment.itemCount === 1 ? "1 item" : `${assignment.itemCount} items`;
  return [
    `${assignment.assignerName} gave you an assignment in "${assignment.groupName}": "${assignment.title}" (${items}).`,
    "I'll send the items one by one. Reply to each one with your answer. Send /cancel to end it early.",
  ].join("\n\n");
}

export function formatAssignmentItem(item: AssignmentItemEntity, itemCount: number): string {
  return `${item.position}/${itemCount}. ${item.prompt}`;
}

/** The private message after the last answer. */
export function formatAssignmentDone(groupName: string): string {
  return `All done, thank you! I've posted your results in "${groupName}".`;
}

/** The private message after the assignee cancels. */
export function formatAssignmentCancelled(groupName: string): string {
  return `Assignment cancelled. I've let "${groupName}" know.`;
}

/** The group message for a completed assignment. */
export function formatAssignmentResult(assigneeName: string, title: string, items: AssignmentItemEntity[]): string {
  return formatResult(`${assigneeName} completed "${title}"`, items);
}

/** The group message for a cancelled assignment: the result covers only the items answered so far. */
export function formatAssignmentCancelledResult(
  assigneeName: string,
  title: string,
  items: AssignmentItemEntity[],
): string {
  const answered = items.filter((item) => item.answer !== null);

  return formatResult(`${assigneeName} cancelled "${title}" after ${answered.length}/${items.length} items`, answered);
}

/** The headline with the score, then the mistakes of graded items and the answers to the others. */
function formatResult(headline: string, items: AssignmentItemEntity[]): string {
  const graded = items.filter((item) => item.expectedAnswer !== null);
  const mistakes = graded.filter((item) => item.isCorrect !== true);
  const ungraded = items.filter((item) => item.expectedAnswer === null);

  const sections = [
    graded.length > 0 ? `${headline}: ${graded.length - mistakes.length}/${graded.length} correct.` : `${headline}.`,
  ];

  if (mistakes.length > 0) {
    sections.push(
      [
        "Mistakes:",
        ...mistakes.map((item) => `${item.position}. ${item.prompt}\n   Answer: ${item.answer}, expected: ${item.expectedAnswer}`),
      ].join("\n"),
    );
  }

  if (ungraded.length > 0) {
    sections.push(
      ["Answers:", ...ungraded.map((item) => `${item.position}. ${item.prompt}\n   Answer: ${item.answer}`)].join("\n"),
    );
  }

  return sections.join("\n\n");
}
