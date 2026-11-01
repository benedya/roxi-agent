import type { DataSource } from "typeorm";
import type { Logger } from "pino";
import type { GroupMemberRepository } from "#core/repositories/group-member.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { TelegramProfile } from "#core/types/telegram";

/** Records who interacts with the bot in a group's chat. */
export class GroupMembershipService {
  private readonly dataSource: DataSource;
  private readonly userRepository: UserRepository;
  private readonly groupMemberRepository: GroupMemberRepository;
  private readonly logger: Logger;

  constructor(
    dataSource: DataSource,
    userRepository: UserRepository,
    groupMemberRepository: GroupMemberRepository,
    logger: Logger,
  ) {
    this.dataSource = dataSource;
    this.userRepository = userRepository;
    this.groupMemberRepository = groupMemberRepository;
    this.logger = logger;
  }

  /** Refreshes the user's profile and adds them to the group on their first interaction. */
  async recordInteraction(groupId: number, profile: TelegramProfile): Promise<void> {
    const added = await this.dataSource.transaction(async (manager) => {
      const userRepository = this.userRepository.withManager(manager);

      await userRepository.upsertFromTelegram(profile);
      const user = await userRepository.findByTelegramId(profile.telegramId);
      if (!user) {
        throw new Error(`User ${profile.telegramId} vanished after upsert.`);
      }

      return this.groupMemberRepository.withManager(manager).addIfAbsent(groupId, user.id);
    });

    if (added) {
      this.logger.info({ groupId, telegramId: profile.telegramId }, "group member added");
    }
  }
}
