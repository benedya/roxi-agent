import { formatUserName } from "#core/helpers/assignment-format";
import { describeRule, parseRule } from "#core/helpers/recurrence";
import { formatRunTime } from "#core/helpers/reminder-timing";
import type { GroupRepository } from "#core/repositories/group.repository";
import type { ReminderRepository } from "#core/repositories/reminder.repository";
import type { ReminderSummary } from "#core/types/reminder";

/** The group's pending reminders, soonest first, with their next run in the group's time zone. */
export class ListRemindersService {
  private readonly groupRepository: GroupRepository;
  private readonly reminderRepository: ReminderRepository;

  constructor(groupRepository: GroupRepository, reminderRepository: ReminderRepository) {
    this.groupRepository = groupRepository;
    this.reminderRepository = reminderRepository;
  }

  async getPending(groupId: number): Promise<ReminderSummary[]> {
    const [group, reminders] = await Promise.all([
      this.groupRepository.getById(groupId),
      this.reminderRepository.findPendingByGroup(groupId),
    ]);

    return reminders.map((reminder) => {
      const rule = reminder.rrule && reminder.dtstart ? parseRule(reminder.rrule, reminder.dtstart) : null;

      return {
        id: reminder.id,
        text: reminder.text,
        createdBy: formatUserName(reminder.creator),
        nextRun: formatRunTime(reminder.dueAt, group.timezone),
        repeats: rule ? describeRule(rule) : null,
      };
    });
  }
}
