import type { NoteRepository } from "#core/repositories/note.repository";
import type { UserRepository } from "#core/repositories/user.repository";
import type { NoteContentService } from "#core/services/notes/note-content.service";

export class SaveNoteService {
  private readonly noteRepository: NoteRepository;
  private readonly userRepository: UserRepository;
  private readonly noteContentService: NoteContentService;

  constructor(noteRepository: NoteRepository, userRepository: UserRepository, noteContentService: NoteContentService) {
    this.noteRepository = noteRepository;
    this.userRepository = userRepository;
    this.noteContentService = noteContentService;
  }

  /** Saves a note in the group on behalf of the Telegram user, summarizing long content; returns its id. */
  async save(groupId: number, authorTelegramId: string, rawContent: string): Promise<number> {
    const { content, summary } = await this.noteContentService.prepare(rawContent);

    // The sender is recorded as a member before the message reaches the agent.
    const author = await this.userRepository.findByTelegramId(authorTelegramId);

    return this.noteRepository.create({ groupId, authorUserId: author?.id ?? null, content, summary });
  }
}
