import type { EntityManager } from "typeorm";
import { GroupEntitySchema, type GroupEntity } from "#core/entities/group.entity";
import { GroupMemberEntitySchema } from "#core/entities/group-member.entity";
import { UserEntitySchema } from "#core/entities/user.entity";
import type { TelegramChat } from "#core/types/telegram";

export class GroupRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  /** The same repository bound to a transaction's EntityManager. */
  withManager(manager: EntityManager): GroupRepository {
    return new GroupRepository(manager);
  }

  findById(id: number): Promise<GroupEntity | null> {
    return this.manager.findOneBy(GroupEntitySchema, { id });
  }

  async getById(id: number): Promise<GroupEntity> {
    const group = await this.findById(id);

    if (!group) {
      throw new Error(`Group ${id} not found.`);
    }

    return group;
  }

  /** Groups the user is an admin of, most recently linked first. */
  findByAdminTelegramId(telegramId: string): Promise<GroupEntity[]> {
    return this.manager
      .createQueryBuilder(GroupEntitySchema, "group")
      .innerJoin(GroupMemberEntitySchema.options.name, "member", "member.groupId = group.id AND member.isAdmin = true")
      .innerJoin(UserEntitySchema.options.name, "user", "user.id = member.userId")
      .where("user.telegramId = :telegramId", { telegramId })
      .orderBy("group.linkedAt", "DESC", "NULLS LAST")
      .addOrderBy("group.id", "DESC")
      .getMany();
  }

  findByTelegramChatId(telegramChatId: string): Promise<GroupEntity | null> {
    return this.manager.findOneBy(GroupEntitySchema, { telegramChatId });
  }

  async updateCustomInstructions(id: number, customInstructions: string | null): Promise<void> {
    await this.manager.update(GroupEntitySchema, { id }, { customInstructions });
  }

  /**
   * Inserts a group linked to the chat; returns null when the chat
   * already has a group (groups_telegram_chat_id_key).
   */
  async createForChatIfAbsent(group: {
    name: string;
    chat: TelegramChat;
  }): Promise<GroupEntity | null> {
    const result = await this.manager
      .createQueryBuilder()
      .insert()
      .into(GroupEntitySchema)
      .values({
        name: group.name,
        telegramChatId: group.chat.chatId,
        chatTitle: group.chat.title,
        chatType: group.chat.type,
        linkedAt: () => "now()",
      })
      .orIgnore()
      .returning(["id"])
      .execute();
    const id = (result.raw as { id: number }[])[0]?.id;
    return id === undefined ? null : this.findById(id);
  }
}
