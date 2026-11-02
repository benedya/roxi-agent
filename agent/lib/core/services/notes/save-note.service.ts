import type { NoteRepository } from "#core/repositories/note.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { NoteContentService } from "#core/services/notes/note-content.service";

import type { SaveNoteResult } from "#core/types/note";

export class SaveNoteService {
  private readonly noteRepository: NoteRepository;
  private readonly userRepository: UserRepository;
  private readonly noteContentService: NoteContentService;
  /** The most notes a group can keep. */
  private readonly maxNotesPerGroup: number;

  constructor(
    noteRepository: NoteRepository,
    userRepository: UserRepository,
    noteContentService: NoteContentService,
    maxNotesPerGroup: number,
  ) {
    this.noteRepository = noteRepository;
    this.userRepository = userRepository;
    this.noteContentService = noteContentService;
    this.maxNotesPerGroup = maxNotesPerGroup;
  }

  /** Saves a note in the group on behalf of the Telegram user, summarizing long content. */
  async save(groupId: number, authorTelegramId: string, rawContent: string): Promise<SaveNoteResult> {
    // Checked before summarizing, so a refused note costs no model call.
    if ((await this.noteRepository.countInGroup(groupId)) >= this.maxNotesPerGroup) {
      return "limit_reached";
    }

    const { content, summary } = await this.noteContentService.prepare(rawContent);

    // The sender is recorded as a member before the message reaches the agent.
    const author = await this.userRepository.findByTelegramId(authorTelegramId);

    await this.noteRepository.create({ groupId, authorUserId: author?.id ?? null, content, summary });
    return "saved";
  }
}
