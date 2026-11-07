import type { EntityManager } from "typeorm";
import { GroupMemberEntitySchema } from "#core/entities/group-member.entity";
import { UserEntitySchema, type UserEntity } from "#core/entities/user.entity";
import { APP_SCHEMA } from "#core/db/schema";
import type { TelegramProfile } from "#core/types/telegram";

export class UserRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  /** The same repository bound to a transaction's EntityManager. */
  withManager(manager: EntityManager): UserRepository {
    return new UserRepository(manager);
  }

  findByTelegramId(telegramId: string): Promise<UserEntity | null> {
    return this.manager.findOneBy(UserEntitySchema, { telegramId });
  }

  async getByTelegramId(telegramId: string): Promise<UserEntity> {
    const user = await this.findByTelegramId(telegramId);

    if (!user) {
      throw new Error(`User ${telegramId} not found.`);
    }

    return user;
  }

  /** Users who are members of the group. */
  findGroupMembers(groupId: number): Promise<UserEntity[]> {
    return this.manager
      .createQueryBuilder(UserEntitySchema, "user")
      .innerJoin(GroupMemberEntitySchema.options.name, "member", "member.userId = user.id")
      .where("member.groupId = :groupId", { groupId })
      .getMany();
  }

  /** Inserts or refreshes a user from their Telegram profile; a profile without a language keeps the saved one. */
  async upsertFromTelegram(profile: TelegramProfile): Promise<void> {
    await this.manager.query(
      `INSERT INTO ${APP_SCHEMA}.users (telegram_id, username, first_name, language_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name,
         language_code = COALESCE(EXCLUDED.language_code, ${APP_SCHEMA}.users.language_code)`,
      [profile.telegramId, profile.username ?? null, profile.firstName ?? null, profile.languageCode ?? null],
    );
  }

  /** Changes the language of an existing user; does nothing for an unknown one. */
  async updateLanguage(telegramId: string, languageCode: string): Promise<void> {
    await this.manager.update(UserEntitySchema, { telegramId }, { languageCode });
  }
}
