import { defaultTelegramAuth, type TelegramInboundResult, type TelegramMessage } from "eve/channels/telegram";
import type { GroupAccessService } from "#core/services/groups/group-access.service";
import type { GroupMembershipService } from "#core/services/groups/group-membership.service";
import type { Logger } from "../logger.ts";
import type { BotAddedHandler } from "./bot-added.handler.ts";
import { isAddressedToBot } from "./addressing.ts";
import type { TelegramGateway } from "./telegram.gateway.ts";

/**
 * Entry point for inbound Telegram messages. The bot joining a chat is handled in
 * code: the chat gets a group owned by whoever added the bot, and a welcome message.
 * Private chats always reach the agent, with the sender's admin groups as context.
 * In group chats only messages addressed to the bot from a registered group reach
 * the agent; the rest are dropped silently.
 * Whoever addresses the bot in a group chat becomes a member of that group.
 */
export class TelegramMessageHandler {
  private readonly botAddedHandler: BotAddedHandler;
  private readonly groupAccessService: GroupAccessService;
  private readonly groupMembershipService: GroupMembershipService;
  private readonly logger: Logger;

  constructor(
    botAddedHandler: BotAddedHandler,
    groupAccessService: GroupAccessService,
    groupMembershipService: GroupMembershipService,
    logger: Logger,
  ) {
    this.botAddedHandler = botAddedHandler;
    this.groupAccessService = groupAccessService;
    this.groupMembershipService = groupMembershipService;
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

    await this.groupMembershipService.recordInteraction(group.id, {
      telegramId: from.id,
      username: from.username,
      firstName: from.firstName,
    });

    await telegram.startTyping();

    log.info({ group }, "dispatched to agent");

    return {
      // eve auth attributes are strings only.
      auth: { ...auth, attributes: { ...auth.attributes, group_id: String(group.id) } },
      context: [
        `<group_context>\ngroup_name: ${group.name}\nsettings: ${JSON.stringify(group.settings)}\n</group_context>`,
      ],
    };
  }
}
