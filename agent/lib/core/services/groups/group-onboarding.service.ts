import type { DataSource } from "typeorm";
import type { GroupEntity } from "#core/entities/group.entity";
import type { Logger } from "../../../logger.ts";
import type { GroupRepository } from "#core/repositories/group.repository";
import type { GroupMemberRepository } from "#core/repositories/group-member.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { TelegramChat, TelegramProfile } from "#core/types/telegram";

export type RegisterChatResult = { created: GroupEntity } | { existing: GroupEntity };

/** Creates a group for each Telegram chat the bot is added to; whoever adds the bot becomes its admin. */
export class GroupOnboardingService {
  private readonly dataSource: DataSource;
  private readonly userRepository: UserRepository;
  private readonly groupRepository: GroupRepository;
  private readonly groupMemberRepository: GroupMemberRepository;
  private readonly logger: Logger;

  constructor(
    dataSource: DataSource,
    userRepository: UserRepository,
    groupRepository: GroupRepository,
    groupMemberRepository: GroupMemberRepository,
    logger: Logger,
  ) {
    this.dataSource = dataSource;
    this.userRepository = userRepository;
    this.groupRepository = groupRepository;
    this.groupMemberRepository = groupMemberRepository;
    this.logger = logger;
  }

  /**
   * Creates the chat's group with the user who added the bot as its admin. A chat that
   * already has a group (the bot was removed and added back) keeps its admins.
   * Either way, whoever added the bot becomes a member of the group.
   */
  async registerChat(
    addedBy: TelegramProfile,
    chat: TelegramChat,
  ): Promise<RegisterChatResult> {
    const result = await this.dataSource.transaction(async (manager): Promise<RegisterChatResult> => {
      const userRepository = this.userRepository.withManager(manager);
      const groupRepository = this.groupRepository.withManager(manager);
      const groupMemberRepository = this.groupMemberRepository.withManager(manager);

      await userRepository.upsertFromTelegram(addedBy);
      const user = await userRepository.findByTelegramId(addedBy.telegramId);
      if (!user) {
        throw new Error(`User ${addedBy.telegramId} vanished after upsert.`);
      }

      const created = await groupRepository.createForChatIfAbsent({
        name: chat.title ?? "Telegram group",
        chat,
      });

      if (!created) {
        const existing = await groupRepository.findByTelegramChatId(chat.chatId);

        if (!existing) {
          throw new Error(`Group for chat ${chat.chatId} vanished after insert conflict.`);
        }

        await groupMemberRepository.addIfAbsent(existing.id, user.id);

        return { existing };
      }

      await groupMemberRepository.addIfAbsent(created.id, user.id, true);

      return { created };
    });

    if ("created" in result) {
      this.logger.info({ groupId: result.created.id, chatId: chat.chatId, adminTelegramId: addedBy.telegramId }, "group created");
    } else {
      this.logger.info({ groupId: result.existing.id, chatId: chat.chatId, addedByTelegramId: addedBy.telegramId }, "bot re-added to an existing group");
    }

    return result;
  }
}
