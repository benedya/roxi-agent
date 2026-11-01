import type { EntityManager } from "typeorm";
import { GroupMemberEntitySchema } from "#core/entities/group-member.entity";

export class GroupMemberRepository {
  private readonly manager: EntityManager;

  constructor(manager: EntityManager) {
    this.manager = manager;
  }

  /** The same repository bound to a transaction's EntityManager. */
  withManager(manager: EntityManager): GroupMemberRepository {
    return new GroupMemberRepository(manager);
  }

  async isAdmin(groupId: number, userId: number): Promise<boolean> {
    return this.manager.existsBy(GroupMemberEntitySchema, { groupId, userId, isAdmin: true });
  }

  /** Adds the user to the group; returns false when they already are a member (isAdmin is then left as is). */
  async addIfAbsent(groupId: number, userId: number, isAdmin = false): Promise<boolean> {
    const result = await this.manager
      .createQueryBuilder()
      .insert()
      .into(GroupMemberEntitySchema)
      .values({ groupId, userId, isAdmin })
      .orIgnore()
      .returning(["id"])
      .execute();
    return (result.raw as unknown[]).length > 0;
  }
}
