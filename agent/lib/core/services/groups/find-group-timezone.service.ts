import type { GroupRepository } from "#core/repositories/group.repository";

/** The group's IANA time zone, or null until an admin sets it. */
export class FindGroupTimezoneService {
  private readonly groupRepository: GroupRepository;

  constructor(groupRepository: GroupRepository) {
    this.groupRepository = groupRepository;
  }

  async find(groupId: number): Promise<string | null> {
    return (await this.groupRepository.findById(groupId))?.timezone ?? null;
  }
}
