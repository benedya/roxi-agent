import type { NoteRepository } from "#core/repositories/note.repository";
import type { NoteChangeResult } from "#core/types/note";
import type { NoteChangeAccessService } from "#core/services/notes/note-change-access.service";
import type { NoteContentService } from "#core/services/notes/note-content.service";

export class EditNoteService {
  private readonly noteRepository: NoteRepository;
  private readonly noteChangeAccessService: NoteChangeAccessService;
  private readonly noteContentService: NoteContentService;

  constructor(
    noteRepository: NoteRepository,
    noteChangeAccessService: NoteChangeAccessService,
    noteContentService: NoteContentService,
  ) {
    this.noteRepository = noteRepository;
    this.noteChangeAccessService = noteChangeAccessService;
    this.noteContentService = noteContentService;
  }

  /** Replaces the note's content with a new version, summarized again when long. */
  async edit(groupId: number, id: number, editorTelegramId: string, rawContent: string): Promise<NoteChangeResult> {
    const access = await this.noteChangeAccessService.check(groupId, id, editorTelegramId);
    if (access !== "done") {
      return access;
    }

    await this.noteRepository.update(id, await this.noteContentService.prepare(rawContent));
    return "done";
  }
}
