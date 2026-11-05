// The /cancel command ends the sender's current activity in their private chat with the bot.
// Today the only such activity is an open assignment.

import type { TelegramMessage } from "eve/channels/telegram";
import type { CancelAssignmentService } from "#core/services/assignments/cancel-assignment.service";
import type { TelegramGateway } from "./telegram.gateway.ts";

export class CancelCommandHandler {
  private readonly cancelAssignmentService: CancelAssignmentService;

  constructor(cancelAssignmentService: CancelAssignmentService) {
    this.cancelAssignmentService = cancelAssignmentService;
  }

  /** Runs the command if the message is /cancel in a private chat; returns true when it was. */
  async handle(message: TelegramMessage, botUsername: string | undefined, telegram: TelegramGateway): Promise<boolean> {
    const from = message.from;

    if (message.chat.type !== "private" || !from || !this.isCancelCommand(message.text, botUsername)) {
      return false;
    }

    const result = await this.cancelAssignmentService.cancel(from.id);

    if (result === "nothing_to_cancel") {
      await telegram.send("There's nothing to cancel right now.");
    }

    return true;
  }

  /** Exactly /cancel or /cancel@this_bot, ignoring case and surrounding spaces. */
  private isCancelCommand(text: string, botUsername: string | undefined): boolean {
    const command = /^\/cancel(?:@(?<target>[A-Za-z0-9_]+))?$/iu.exec(text.trim());

    if (!command) {
      return false;
    }

    const target = command.groups?.target;

    return target === undefined || target.toLowerCase() === botUsername?.toLowerCase();
  }
}
