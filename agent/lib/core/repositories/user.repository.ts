import type { EntityManager } from "typeorm";
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

  /** Inserts or refreshes a user from their Telegram profile. */
  async upsertFromTelegram(profile: TelegramProfile): Promise<void> {
    await this.manager.query(
      `INSERT INTO ${APP_SCHEMA}.users (telegram_id, username, first_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username = EXCLUDED.username,
         first_name = EXCLUDED.first_name`,
      [profile.telegramId, profile.username ?? null, profile.firstName ?? null],
    );
  }
}
