import type { Logger } from "pino";
import type { AssignmentWithParticipants } from "#core/types/assignment";
import type { TelegramOutgoingMessage, TelegramSender } from "#core/types/telegram";

/** Tells the assignee and the group that an assignment closed; the group message replies to the request. */
export class NotifyAssignmentClosedService {
  private readonly telegramSender: TelegramSender;
  private readonly logger: Logger;

  constructor(telegramSender: TelegramSender, logger: Logger) {
    this.telegramSender = telegramSender;
    this.logger = logger;
  }

  /** The assignment is closed either way, so a failed message is logged and doesn't stop the other. */
  async notify(assignment: AssignmentWithParticipants, texts: { assignee: string; group: string }): Promise<void> {
    await this.sendQuietly(assignment.id, "assignee message", {
      chatId: assignment.assignee.telegramId,
      text: texts.assignee,
    });

    const groupChatId = assignment.group.telegramChatId;

    if (!groupChatId) {
      this.logger.warn({ assignmentId: assignment.id }, "assignment result not posted: the group has no chat");
      return;
    }

    await this.sendQuietly(assignment.id, "group result", {
      chatId: groupChatId,
      text: texts.group,
      replyToMessageId: assignment.sourceMessageId,
    });
  }

  private async sendQuietly(assignmentId: number, what: string, message: TelegramOutgoingMessage): Promise<void> {
    try {
      const result = await this.telegramSender.send(message);

      if (result.status === "unreachable") {
        this.logger.warn({ assignmentId }, `assignment ${what} not sent: chat unreachable`);
      }
    } catch (error) {
      this.logger.warn({ err: error, assignmentId }, `assignment ${what} not sent`);
    }
  }
}
