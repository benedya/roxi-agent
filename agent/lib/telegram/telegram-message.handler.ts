import { defaultTelegramAuth, type TelegramInboundResult, type TelegramMessage } from "eve/channels/telegram";
import type { GroupAccessService } from "#core/services/groups/group-access.service";
import type { GroupMembershipService } from "#core/services/groups/group-membership.service";
import type { RecordUserLanguageService } from "#core/services/users/record-user-language.service";
import type { Logger } from "#lib/logger";
import type { AssignmentAnswerHandler } from "#lib/telegram/assignment-answer.handler";
import type { BotAddedHandler } from "#lib/telegram/bot-added.handler";
import type { CancelCommandHandler } from "#lib/telegram/cancel-command.handler";
import { isAddressedToBot } from "#lib/telegram/addressing";
import type { TelegramGateway } from "#lib/telegram/telegram.gateway";
import { toTelegramProfile } from "#lib/telegram/telegram-profile";

/**
 * Entry point for inbound Telegram messages. The bot joining a chat is handled in
 * code: the chat gets a group owned by whoever added the bot, and a welcome message.
 * Private chats reach the agent, with the sender's admin groups as context, except /cancel
 * and, while the sender has an open assignment, their answers: both are handled in code.
 * In group chats only messages addressed to the bot from a registered group reach
 * the agent; the rest are dropped silently.
 * Whoever addresses the bot in a group chat becomes a member of that group.
 */
export class TelegramMessageHandler {
  private readonly botAddedHandler: BotAddedHandler;
  private readonly cancelCommandHandler: CancelCommandHandler;
  private readonly assignmentAnswerHandler: AssignmentAnswerHandler;
  private readonly groupAccessService: GroupAccessService;
  private readonly groupMembershipService: GroupMembershipService;
  private readonly recordUserLanguageService: RecordUserLanguageService;
  private readonly logger: Logger;

  constructor(
    botAddedHandler: BotAddedHandler,
    cancelCommandHandler: CancelCommandHandler,
    assignmentAnswerHandler: AssignmentAnswerHandler,
    groupAccessService: GroupAccessService,
    groupMembershipService: GroupMembershipService,
    recordUserLanguageService: RecordUserLanguageService,
    logger: Logger,
  ) {
    this.botAddedHandler = botAddedHandler;
    this.cancelCommandHandler = cancelCommandHandler;
    this.assignmentAnswerHandler = assignmentAnswerHandler;
    this.groupAccessService = groupAccessService;
    this.groupMembershipService = groupMembershipService;
    this.recordUserLanguageService = recordUserLanguageService;
    this.logger = logger;
  }

  async handle(message: TelegramMessage, telegram: TelegramGateway): Promise<TelegramInboundResult> {
    // Ids only: message text never goes to the logs.
    const log = this.logger.child({ chatId: message.chat.id, chatType: message.chat.type, userId: message.from?.id });

    const botUsername = await telegram.resolveBotUsername();

    // Before the addressing check: the join service message has no text.
    if (await this.botAddedHandler.handle(message, botUsername, telegram)) {
      return null;
    }

    if (!isAddressedToBot(message, botUsername)) {
      log.debug("ignored: not addressed to the bot");
      return null;
    }

    const from = message.from;

    if (!from) {
      log.info("ignored: message has no sender");
      return null;
    }

    const auth = defaultTelegramAuth(message);

    if (!auth) {
      // Unreachable while `from` is set; satisfies the nullable return type.
      return null;
    }

    if (message.chat.type === "private") {
      await this.recordUserLanguageService.record(from.id, from.languageCode);

      if (await this.cancelCommandHandler.handle(message, botUsername, telegram)) {
        return null;
      }

      if (await this.assignmentAnswerHandler.handle(message)) {
        return null;
      }

      const groups = await this.groupAccessService.listGroupsForPrivateChat(from.id);
      const groupNames = groups.map((group) => group.chatTitle ?? group.name);

      await telegram.startTyping();

      log.info({ groupCount: groups.length }, "private chat: dispatched to agent");

      return {
        auth,
        context: [
          `<private_chat_context>\nbot_username: ${botUsername ? `@${botUsername}` : "unknown"}\ngroups: ${JSON.stringify(groupNames)}\n</private_chat_context>`,
        ],
      };
    }

    const group = await this.groupAccessService.findGroupForChat(message.chat.id);

    if (!group) {
      log.info("dropped: no group for this chat");
      return null;
    }

    await this.groupMembershipService.recordInteraction(group.id, toTelegramProfile(from));

    await telegram.startTyping();

    log.info({ group }, "dispatched to agent");

    return {
      // eve auth attributes are strings only.
      auth: { ...auth, attributes: { ...auth.attributes, group_id: String(group.id) } },
      context: [`<group_context>\ngroup_name: ${group.name}\n</group_context>`],
    };
  }
}
