import type { UserEntity } from "#core/entities/user.entity";

/** Members named by @username first, then by first name; case-insensitive. */
export function findMatchingMembers(members: UserEntity[], name: string): UserEntity[] {
  const normalized = name.trim().replace(/^@/u, "").toLowerCase();

  const byUsername = members.filter((member) => member.username?.toLowerCase() === normalized);

  if (byUsername.length > 0) {
    return byUsername;
  }

  return members.filter((member) => member.firstName?.toLowerCase() === normalized);
}
