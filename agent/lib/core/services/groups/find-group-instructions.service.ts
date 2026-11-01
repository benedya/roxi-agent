import type { GroupRepository } from "#core/repositories/group.repository";

export class FindGroupInstructionsService {
  private readonly groupRepository: GroupRepository;

  constructor(groupRepository: GroupRepository) {
    this.groupRepository = groupRepository;
  }

  /** The group's custom instructions, or null when it has none (or the group doesn't exist). */
  async find(groupId: number): Promise<string | null> {
    const group = await this.groupRepository.findById(groupId);
    return group?.customInstructions ?? null;
  }
}
