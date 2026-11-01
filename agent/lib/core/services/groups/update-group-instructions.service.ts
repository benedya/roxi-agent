import type { GroupMemberRepository } from "#core/repositories/group-member.repository";
import type { GroupRepository } from "#core/repositories/group.repository";
import type { UserRepository } from "#core/repositories/user.repository";

/** Longest instructions the set_group_instructions tool accepts. */
export const CUSTOM_INSTRUCTIONS_MAX_LENGTH = 1000;

type UpdateGroupInstructionsResult = "done" | "forbidden";

/** Replaces or clears a group's custom instructions; only the group's admins may. */
export class UpdateGroupInstructionsService {
  private readonly groupRepository: GroupRepository;
  private readonly userRepository: UserRepository;
  private readonly groupMemberRepository: GroupMemberRepository;

  constructor(groupRepository: GroupRepository, userRepository: UserRepository, groupMemberRepository: GroupMemberRepository) {
    this.groupRepository = groupRepository;
    this.userRepository = userRepository;
    this.groupMemberRepository = groupMemberRepository;
  }

  /** Blank instructions clear them. */
  async update(groupId: number, editorTelegramId: string, instructions: string): Promise<UpdateGroupInstructionsResult> {
    const user = await this.userRepository.findByTelegramId(editorTelegramId);
    if (!user || !(await this.groupMemberRepository.isAdmin(groupId, user.id))) {
      return "forbidden";
    }

    const trimmed = instructions.trim();
    await this.groupRepository.updateCustomInstructions(groupId, trimmed === "" ? null : trimmed);
    return "done";
  }
}
