// Handles the service message Telegram sends when the bot joins a group chat:
// anyone can add the bot, and whoever adds it becomes an admin member of the chat's group.

import type { TelegramMessage } from "eve/channels/telegram";
import type { Logger } from "#lib/logger";
import type { GroupOnboardingService } from "#core/services/groups/group-onboarding.service";
import type { LocalizedMessageService } from "#core/services/translations/localized-message.service";
import type { TelegramGateway } from "#lib/telegram/telegram.gateway";
import { toTelegramProfile } from "#lib/telegram/telegram-profile";

type RawChatMember = { is_bot?: boolean; username?: string };

export class BotAddedHandler {
  private readonly groupOnboardingService: GroupOnboardingService;
  private readonly localizedMessageService: LocalizedMessageService;
  private readonly logger: Logger;

  constructor(
    groupOnboardingService: GroupOnboardingService,
    localizedMessageService: LocalizedMessageService,
    logger: Logger,
  ) {
    this.groupOnboardingService = groupOnboardingService;
    this.localizedMessageService = localizedMessageService;
    this.logger = logger;
  }

  /** Registers the chat's group and welcomes the chat if the bot was just added; returns true when it was. */
  async handle(message: TelegramMessage, botUsername: string | undefined, telegram: TelegramGateway): Promise<boolean> {
    const chatType = message.chat.type;

    if ((chatType !== "group" && chatType !== "supergroup") || !this.isBotAddedMessage(message, botUsername)) {
      return false;
    }

    const from = message.from;

    if (!from) {
      this.logger.warn({ chatId: message.chat.id }, "bot added but the message has no sender");
      return true;
    }

    const profile = toTelegramProfile(from);
    const result = await this.groupOnboardingService.registerChat(profile, {
      chatId: message.chat.id,
      title: message.chat.title ?? null,
      type: chatType,
    });

    const group = "created" in result ? result.created : result.existing;
    this.logger.info({ chatId: message.chat.id, userId: from.id, groupId: group.id }, "bot added to chat");

    const mention = botUsername ? `@${botUsername}` : "me";

    await telegram.send(
      await this.localizedMessageService.getMessage("group.welcome", profile.languageCode ?? null, { mention }),
    );

    return true;
  }

  /**
   * Whether this message announces the bot joining: it is listed in `new_chat_members`,
   * or the chat was created with the bot in it (`group_chat_created` lists no members).
   */
  private isBotAddedMessage(message: TelegramMessage, botUsername: string | undefined): boolean {
    const raw = message.raw;
    if (raw.group_chat_created === true || raw.supergroup_chat_created === true) {
      return true;
    }
    const members = Array.isArray(raw.new_chat_members) ? (raw.new_chat_members as RawChatMember[]) : [];
    return (
      botUsername !== undefined &&
      members.some((member) => member.is_bot === true && member.username?.toLowerCase() === botUsername.toLowerCase())
    );
  }
}
