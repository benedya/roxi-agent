import type { Logger } from "pino";
import {
  formatAssignmentDone,
  formatAssignmentResult,
  formatGroupName,
  formatUserName,
} from "#core/helpers/assignment-format";
import type { AssignmentRepository } from "#core/repositories/assignment.repository";
import type { AssignmentItemRepository } from "#core/repositories/assignment-item.repository";
import type { AssignmentWithParticipants } from "#core/types/assignment";
import type { TelegramOutgoingMessage, TelegramSender } from "#core/types/telegram";

/** Closes an answered assignment, thanks the assignee, and posts the result in the group as a reply to the request. */
export class CompleteAssignmentService {
  private readonly assignmentRepository: AssignmentRepository;
  private readonly assignmentItemRepository: AssignmentItemRepository;
  private readonly telegramSender: TelegramSender;
  private readonly logger: Logger;

  constructor(
    assignmentRepository: AssignmentRepository,
    assignmentItemRepository: AssignmentItemRepository,
    telegramSender: TelegramSender,
    logger: Logger,
  ) {
    this.assignmentRepository = assignmentRepository;
    this.assignmentItemRepository = assignmentItemRepository;
    this.telegramSender = telegramSender;
    this.logger = logger;
  }

  async complete(assignment: AssignmentWithParticipants): Promise<void> {
    // Another message may have completed it already: the result is posted once.
    if (!(await this.assignmentRepository.markCompleted(assignment.id))) {
      return;
    }

    const items = await this.assignmentItemRepository.findByAssignment(assignment.id);
    const groupName = formatGroupName(assignment.group);

    // The assignment is closed either way, so a failed message is logged and doesn't stop the other.
    await this.sendQuietly(assignment.id, "done message", {
      chatId: assignment.assignee.telegramId,
      text: formatAssignmentDone(groupName),
    });

    const groupChatId = assignment.group.telegramChatId;
    if (!groupChatId) {
      this.logger.warn({ assignmentId: assignment.id }, "assignment result not posted: the group has no chat");
      return;
    }

    await this.sendQuietly(assignment.id, "group result", {
      chatId: groupChatId,
      text: formatAssignmentResult(formatUserName(assignment.assignee), assignment.title, items),
      replyToMessageId: assignment.sourceMessageId,
    });

    this.logger.info({ assignmentId: assignment.id, groupId: assignment.groupId }, "assignment completed");
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
