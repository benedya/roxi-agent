import type { DataSource } from "typeorm";
import type { Logger } from "pino";
import { formatUserName } from "#core/helpers/assignment-format";
import { findReminderDueAt } from "#core/helpers/reminder-timing";
import type { ReminderRepository } from "#core/repositories/reminder.repository";
import type { LocalizedMessageService } from "#core/services/translations/localized-message.service";
import type { ReminderWithParticipants } from "#core/types/reminder";
import type { TelegramSender } from "#core/types/telegram";

/** The most reminders one dispatcher run posts; the rest wait for the next minute. */
const MAX_REMINDERS_PER_RUN = 100;

/**
 * Posts due reminders in their groups, called every minute by the reminders schedule. Each reminder is
 * locked in its own transaction while it is posted, so overlapping runs skip it and a crash releases it.
 * Delivery is at least once: a crash after posting but before the commit posts it again next run.
 */
export class DispatchDueRemindersService {
  private readonly dataSource: DataSource;
  private readonly reminderRepository: ReminderRepository;
  private readonly localizedMessageService: LocalizedMessageService;
  private readonly telegramSender: TelegramSender;
  private readonly logger: Logger;

  constructor(
    dataSource: DataSource,
    reminderRepository: ReminderRepository,
    localizedMessageService: LocalizedMessageService,
    telegramSender: TelegramSender,
    logger: Logger,
  ) {
    this.dataSource = dataSource;
    this.reminderRepository = reminderRepository;
    this.localizedMessageService = localizedMessageService;
    this.telegramSender = telegramSender;
    this.logger = logger;
  }

  /** A reminder that fails to post stays pending and is retried on the next run. */
  async dispatchDue(now: Date): Promise<void> {
    // Failed in this run: skipped so the loop moves on instead of retrying them right away.
    const failedIds: number[] = [];

    for (let handled = 0; handled < MAX_REMINDERS_PER_RUN; handled++) {
      const current: { id: number | null } = { id: null };

      try {
        const found = await this.dataSource.transaction(async (manager) => {
          const reminderRepository = this.reminderRepository.withManager(manager);
          const reminder = await reminderRepository.lockNextDue(now, failedIds);

          if (!reminder) {
            return false;
          }

          current.id = reminder.id;
          await this.post(reminderRepository, reminder, now);

          return true;
        });

        if (!found) {
          return;
        }
      } catch (error) {
        if (current.id === null) {
          throw error;
        }

        this.logger.warn({ err: error, reminderId: current.id }, "reminder not posted: retrying next run");
        failedIds.push(current.id);
      }
    }
  }

  private async post(reminderRepository: ReminderRepository, reminder: ReminderWithParticipants, now: Date): Promise<void> {
    const chatId = reminder.group.telegramChatId;

    if (!chatId) {
      this.logger.warn({ reminderId: reminder.id }, "reminder not posted: the group has no chat");
      await reminderRepository.markFailed(reminder.id);
      return;
    }

    const text = await this.localizedMessageService.getMessage("reminder.message", reminder.creator.languageCode, {
      creatorName: formatUserName(reminder.creator),
      text: reminder.text,
    });
    const result = await this.telegramSender.send({ chatId, text, replyToMessageId: reminder.sourceMessageId });

    if (result.status === "unreachable") {
      this.logger.warn({ reminderId: reminder.id }, "reminder not posted: chat unreachable");
      await reminderRepository.markFailed(reminder.id);
      return;
    }

    // Repeating reminders always have a zone: it is required to create them and can't be cleared.
    const timezone = reminder.group.timezone ?? "UTC";
    // The next run after now, not after the due time, so runs missed while the bot was down aren't sent in a burst.
    const nextDueAt = reminder.rrule ? findReminderDueAt(reminder, timezone, now) : null;

    if (nextDueAt) {
      await reminderRepository.reschedule(reminder.id, nextDueAt, result.messageId);
    } else {
      await reminderRepository.markSent(reminder.id, result.messageId);
    }

    this.logger.info({ reminderId: reminder.id, repeating: nextDueAt !== null }, "reminder posted");
  }
}
