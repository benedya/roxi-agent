// Names and item lines in assignment messages; the translated texts around them are in AssignmentMessagesService.

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

export function formatAssignmentItem(item: AssignmentItemEntity, itemCount: number): string {
  return `${item.position}/${itemCount}. ${item.prompt}`;
}
