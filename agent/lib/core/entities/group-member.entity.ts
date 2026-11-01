import { EntitySchema } from "typeorm";
import { APP_SCHEMA } from "#core/db/schema";
import type { GroupEntity } from "#core/entities/group.entity";
import type { UserEntity } from "#core/entities/user.entity";

/** A user who has interacted with the bot in a group's chat; admins see the group listed in private chats. */
export interface GroupMemberEntity {
  id: number;
  groupId: number;
  group?: GroupEntity;
  userId: number;
  user?: UserEntity;
  isAdmin: boolean;
  createdAt: Date;
}

export const GroupMemberEntitySchema = new EntitySchema<GroupMemberEntity>({
  name: "GroupMember",
  tableName: "group_members",
  schema: APP_SCHEMA,
  columns: {
    id: { type: "integer", primary: true, generated: "increment" },
    groupId: { type: "integer", name: "group_id" },
    userId: { type: "integer", name: "user_id" },
    isAdmin: { type: "boolean", name: "is_admin", default: false },
    createdAt: { type: "timestamptz", name: "created_at", createDate: true },
  },
  relations: {
    group: {
      type: "many-to-one",
      target: "Group",
      onDelete: "CASCADE",
      joinColumn: { name: "group_id", foreignKeyConstraintName: "group_members_group_id_fkey" },
    },
    user: {
      type: "many-to-one",
      target: "User",
      onDelete: "CASCADE",
      joinColumn: { name: "user_id", foreignKeyConstraintName: "group_members_user_id_fkey" },
    },
  },
  uniques: [{ name: "group_members_group_id_user_id_key", columns: ["groupId", "userId"] }],
  indices: [{ name: "group_members_user_id_idx", columns: ["userId"] }],
});
