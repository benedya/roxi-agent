import type { Logger } from "pino";
import { planReminder } from "#core/helpers/reminder-plan";
import { formatRunTime } from "#core/helpers/reminder-timing";
import type { GroupRepository } from "#core/repositories/group.repository";
import type { ReminderRepository } from "#core/repositories/reminder.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { CreateReminderInput, CreateReminderResult } from "#core/types/reminder";

/** Limits of the create_reminder tool's input. */
export const REMINDER_TEXT_MAX_LENGTH = 500;
export const REMINDER_MAX_DELAY_MINUTES = 366 * 24 * 60;
export const REMINDER_RULE_MAX_LENGTH = 300;

/** Runs shown to confirm a repeating rule. */
const SHOWN_RUNS = 3;

/** Creates a reminder in a group: any member can. Wall-clock times need the group's time zone. */
export class CreateReminderService {
  private readonly groupRepository: GroupRepository;
  private readonly userRepository: UserRepository;
  private readonly reminderRepository: ReminderRepository;
  private readonly maxRemindersPerGroup: number;
  private readonly logger: Logger;

  constructor(
    groupRepository: GroupRepository,
    userRepository: UserRepository,
    reminderRepository: ReminderRepository,
    maxRemindersPerGroup: number,
    logger: Logger,
  ) {
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.reminderRepository = reminderRepository;
    this.maxRemindersPerGroup = maxRemindersPerGroup;
    this.logger = logger;
  }

  async create(input: CreateReminderInput): Promise<CreateReminderResult> {
    if ((await this.reminderRepository.countPendingByGroup(input.groupId)) >= this.maxRemindersPerGroup) {
      return { status: "limit_reached", limit: this.maxRemindersPerGroup };
    }

    const group = await this.groupRepository.getById(input.groupId);
    const now = new Date();
    const plan = planReminder(input.timing, group.timezone, now);

    if ("status" in plan) {
      return plan;
    }

    // The sender is recorded as a member before the message reaches the agent.
    const creator = await this.userRepository.getByTelegramId(input.creatorTelegramId);
    const id = await this.reminderRepository.create({
      groupId: input.groupId,
      creatorUserId: creator.id,
      text: input.text,
      rrule: plan.rrule,
      dtstart: plan.dtstart,
      dueAt: plan.dueAt,
      sourceMessageId: input.sourceMessageId,
    });

    this.logger.info({ groupId: input.groupId, reminderId: id, repeating: plan.rrule !== null }, "reminder created");

    return {
      status: "created",
      repeats: plan.repeats,
      nextRuns: plan.runs.slice(0, SHOWN_RUNS).map((run) => formatRunTime(run, group.timezone)),
    };
  }
}
