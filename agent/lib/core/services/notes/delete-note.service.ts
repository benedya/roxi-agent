import type { NoteRepository } from "#core/repositories/note.repository";
import type { NoteChangeResult } from "#core/types/note";
import type { NoteChangeAccessService } from "#core/services/notes/note-change-access.service";

export class DeleteNoteService {
  private readonly noteRepository: NoteRepository;
  private readonly noteChangeAccessService: NoteChangeAccessService;

  constructor(noteRepository: NoteRepository, noteChangeAccessService: NoteChangeAccessService) {
    this.noteRepository = noteRepository;
    this.noteChangeAccessService = noteChangeAccessService;
  }

  async delete(groupId: number, id: number, requesterTelegramId: string): Promise<NoteChangeResult> {
    const access = await this.noteChangeAccessService.check(groupId, id, requesterTelegramId);
    if (access !== "done") {
      return access;
    }

    await this.noteRepository.delete(id);
    return "done";
  }
}
