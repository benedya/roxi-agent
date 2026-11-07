import type { AssignmentItemEntity } from "#core/entities/assignment-item.entity";
import { formatAssignmentItem } from "#core/helpers/assignment-format";
import type { AssignmentItemRepository } from "#core/repositories/assignment-item.repository";
import type { TelegramSendResult, TelegramSender } from "#core/types/telegram";

/** Sends an assignment item to its assignee's private chat. */
export class SendAssignmentItemService {
  private readonly assignmentItemRepository: AssignmentItemRepository;
  private readonly telegramSender: TelegramSender;

  constructor(assignmentItemRepository: AssignmentItemRepository, telegramSender: TelegramSender) {
    this.assignmentItemRepository = assignmentItemRepository;
    this.telegramSender = telegramSender;
  }

  /** Remembers the sent message, so only messages after it count as the item's answer. */
  async send(assigneeTelegramId: string, item: AssignmentItemEntity): Promise<TelegramSendResult> {
    const itemCount = await this.assignmentItemRepository.countByAssignment(item.assignmentId);
    const result = await this.telegramSender.send({ chatId: assigneeTelegramId, text: formatAssignmentItem(item, itemCount) });

    if (result.status === "sent") {
      await this.assignmentItemRepository.setPromptMessageId(item.id, result.messageId);
    }

    return result;
  }
}
