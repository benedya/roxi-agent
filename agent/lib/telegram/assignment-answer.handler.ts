// While a user has an open assignment, every message in their private chat with the bot except
// /cancel is an answer: it is handled in code and never reaches the agent.

import type { TelegramMessage } from "eve/channels/telegram";
import type { Logger } from "../logger.ts";
import type { RecordAnswerService } from "#core/services/assignments/record-answer.service";

export class AssignmentAnswerHandler {
  private readonly recordAnswerService: RecordAnswerService;
  private readonly logger: Logger;

  constructor(recordAnswerService: RecordAnswerService, logger: Logger) {
    this.recordAnswerService = recordAnswerService;
    this.logger = logger;
  }

  /** Records the private message as an assignment answer; returns false when the sender has no open assignment. */
  async handle(message: TelegramMessage): Promise<boolean> {
    const from = message.from;
    if (message.chat.type !== "private" || !from) {
      return false;
    }

    // Text only: captions and attachments don't count as answers.
    const result = await this.recordAnswerService.record({
      telegramId: from.id,
      messageId: message.messageId,
      text: message.text,
    });

    if (result === "no_open_assignment") {
      return false;
    }

    // Ids only: answers never go to the logs.
    this.logger.info({ userId: from.id, result }, "assignment answer handled");
    return true;
  }
}
