import type { GroupMemberRepository } from "#core/repositories/group-member.repository";
import type { ReminderRepository } from "#core/repositories/reminder.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { CancelReminderResult } from "#core/types/reminder";

/** Cancels a pending reminder, a whole series for a repeating one: its creator and the group's admins may. */
export class CancelReminderService {
  private readonly reminderRepository: ReminderRepository;
  private readonly userRepository: UserRepository;
  private readonly groupMemberRepository: GroupMemberRepository;

  constructor(
    reminderRepository: ReminderRepository,
    userRepository: UserRepository,
    groupMemberRepository: GroupMemberRepository,
  ) {
    this.reminderRepository = reminderRepository;
    this.userRepository = userRepository;
    this.groupMemberRepository = groupMemberRepository;
  }

  async cancel(groupId: number, id: number, telegramId: string): Promise<CancelReminderResult> {
    const [reminder, user] = await Promise.all([
      this.reminderRepository.findPendingInGroup(groupId, id),
      this.userRepository.findByTelegramId(telegramId),
    ]);

    if (!reminder) {
      return "not_found";
    }

    if (!user || (reminder.creatorUserId !== user.id && !(await this.groupMemberRepository.isAdmin(groupId, user.id)))) {
      return "forbidden";
    }

    return (await this.reminderRepository.markCancelled(id)) ? "done" : "not_found";
  }
}
