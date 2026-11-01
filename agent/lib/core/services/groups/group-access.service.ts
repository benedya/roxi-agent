// Decides which group (if any) an inbound Telegram message belongs to.
//
// Group chats: the chat must be the linked chat of a group.
// Private chats: dispatched to the agent with the list of groups the sender admins.

import type { GroupEntity } from "#core/entities/group.entity";
import type { GroupRepository } from "#core/repositories/group.repository";

export class GroupAccessService {
  private readonly groupRepository: GroupRepository;

  constructor(groupRepository: GroupRepository) {
    this.groupRepository = groupRepository;
  }

  findGroupForChat(chatId: string): Promise<GroupEntity | null> {
    return this.groupRepository.findByTelegramChatId(chatId);
  }

  listGroupsForPrivateChat(telegramUserId: string): Promise<GroupEntity[]> {
    return this.groupRepository.findByAdminTelegramId(telegramUserId);
  }
}
