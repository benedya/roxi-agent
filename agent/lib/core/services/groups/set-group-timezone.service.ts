import type { DataSource } from "typeorm";
import { findReminderDueAt } from "#core/helpers/reminder-timing";
import { formatLocalTime, isValidTimezone } from "#core/helpers/timezone";
import type { GroupMemberRepository } from "#core/repositories/group-member.repository";
import type { GroupRepository } from "#core/repositories/group.repository";
import type { ReminderRepository } from "#core/repositories/reminder.repository";
import type { UserRepository } from "#core/repositories/user.repository";

type SetGroupTimezoneResult = { status: "done"; localTime: string } | { status: "invalid_timezone" } | { status: "forbidden" };

/**
 * Sets a group's time zone; only the group's admins may. Pending wall-clock reminders move with it,
 * so "09:00" stays 09:00 in the new zone.
 */
export class SetGroupTimezoneService {
  private readonly dataSource: DataSource;
  private readonly groupRepository: GroupRepository;
  private readonly userRepository: UserRepository;
  private readonly groupMemberRepository: GroupMemberRepository;
  private readonly reminderRepository: ReminderRepository;

  constructor(
    dataSource: DataSource,
    groupRepository: GroupRepository,
    userRepository: UserRepository,
    groupMemberRepository: GroupMemberRepository,
    reminderRepository: ReminderRepository,
  ) {
    this.dataSource = dataSource;
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.groupMemberRepository = groupMemberRepository;
    this.reminderRepository = reminderRepository;
  }

  async set(groupId: number, editorTelegramId: string, timezone: string): Promise<SetGroupTimezoneResult> {
    const user = await this.userRepository.findByTelegramId(editorTelegramId);
    if (!user || !(await this.groupMemberRepository.isAdmin(groupId, user.id))) {
      return { status: "forbidden" };
    }

    if (!isValidTimezone(timezone)) {
      return { status: "invalid_timezone" };
    }

    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const reminderRepository = this.reminderRepository.withManager(manager);

      await this.groupRepository.withManager(manager).updateTimezone(groupId, timezone);

      for (const reminder of await reminderRepository.findPendingByGroup(groupId)) {
        const dueAt = findReminderDueAt(reminder, timezone, now);

        if (dueAt && dueAt.getTime() !== reminder.dueAt.getTime()) {
          await reminderRepository.updateDueAt(reminder.id, dueAt);
        }
      }
    });

    return { status: "done", localTime: formatLocalTime(now, timezone) };
  }
}
