import type { GroupMemberRepository } from "#core/repositories/group-member.repository";
import type { NoteRepository } from "#core/repositories/note.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { NoteChangeResult } from "#core/types/note";

/** Decides whether a user may edit or delete a note: its author and the group's admins may. */
export class NoteChangeAccessService {
  private readonly noteRepository: NoteRepository;
  private readonly userRepository: UserRepository;
  private readonly groupMemberRepository: GroupMemberRepository;

  constructor(noteRepository: NoteRepository, userRepository: UserRepository, groupMemberRepository: GroupMemberRepository) {
    this.noteRepository = noteRepository;
    this.userRepository = userRepository;
    this.groupMemberRepository = groupMemberRepository;
  }

  /** "done" when the note is in the group and the user wrote it or is a group admin. */
  async check(groupId: number, id: number, telegramId: string): Promise<NoteChangeResult> {
    const [note, user] = await Promise.all([
      this.noteRepository.findInGroup(groupId, id),
      this.userRepository.findByTelegramId(telegramId),
    ]);

    if (!note) {
      return "not_found";
    }
    if (!user) {
      return "forbidden";
    }
    if (note.authorUserId === user.id || (await this.groupMemberRepository.isAdmin(groupId, user.id))) {
      return "done";
    }
    return "forbidden";
  }
}
