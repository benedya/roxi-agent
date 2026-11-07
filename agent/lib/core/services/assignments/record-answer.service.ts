import { isAnswerCorrect } from "#core/helpers/answer-check";
import type { AssignmentRepository } from "#core/repositories/assignment.repository";
import type { AssignmentItemRepository } from "#core/repositories/assignment-item.repository";
import type { CompleteAssignmentService } from "#core/services/assignments/complete-assignment.service";
import type { SendAssignmentItemService } from "#core/services/assignments/send-assignment-item.service";
import type { RecordAnswerResult } from "#core/types/assignment";

/**
 * Takes an assignee's private message as the answer to their current item, then sends the next item
 * or completes the assignment.
 */
export class RecordAnswerService {
  private readonly assignmentRepository: AssignmentRepository;
  private readonly assignmentItemRepository: AssignmentItemRepository;
  private readonly sendAssignmentItemService: SendAssignmentItemService;
  private readonly completeAssignmentService: CompleteAssignmentService;

  constructor(
    assignmentRepository: AssignmentRepository,
    assignmentItemRepository: AssignmentItemRepository,
    sendAssignmentItemService: SendAssignmentItemService,
    completeAssignmentService: CompleteAssignmentService,
  ) {
    this.assignmentRepository = assignmentRepository;
    this.assignmentItemRepository = assignmentItemRepository;
    this.sendAssignmentItemService = sendAssignmentItemService;
    this.completeAssignmentService = completeAssignmentService;
  }

  async record(message: { telegramId: string; messageId: string; text: string }): Promise<RecordAnswerResult> {
    const assignment = await this.assignmentRepository.findOpenByAssigneeTelegramId(message.telegramId);

    if (!assignment) {
      return "no_open_assignment";
    }

    const item = await this.assignmentItemRepository.findNextUnanswered(assignment.id);

    if (!item) {
      // Every item is answered but completing was interrupted: finish it now.
      await this.completeAssignmentService.complete(assignment);

      return "completed";
    }

    // The item's send failed earlier: send it now; this message can't be its answer.
    if (item.promptMessageId === null) {
      await this.sendAssignmentItemService.send(message.telegramId, item);
      return "ignored";
    }

    const answer = message.text.trim();
    // Message ids grow within a chat: a lower id was sent before the current item,
    // e.g. a second quick message after the previous answer.
    if (answer === "" || BigInt(message.messageId) < BigInt(item.promptMessageId)) {
      return "ignored";
    }

    const isCorrect = item.expectedAnswer === null ? null : isAnswerCorrect(item.expectedAnswer, answer);

    if (!(await this.assignmentItemRepository.recordAnswer(item.id, answer, isCorrect))) {
      return "ignored";
    }

    const nextItem = await this.assignmentItemRepository.findNextUnanswered(assignment.id);

    if (nextItem) {
      await this.sendAssignmentItemService.send(message.telegramId, nextItem);

      return "recorded";
    }

    await this.completeAssignmentService.complete(assignment);

    return "completed";
  }
}
