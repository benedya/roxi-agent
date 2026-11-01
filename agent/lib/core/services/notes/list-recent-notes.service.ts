import { toNoteListEntry } from "#core/helpers/note-format";
import type { NoteRepository } from "#core/repositories/note.repository";
import type { NoteListEntry } from "#core/types/note";

const LIST_LIMIT = 100;

export class ListRecentNotesService {
  private readonly noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  /** The group's newest notes, with how many the group has in all. */
  async listRecent(groupId: number): Promise<{ total: number; notes: NoteListEntry[] }> {
    const [notes, total] = await Promise.all([
      this.noteRepository.findRecent(groupId, LIST_LIMIT),
      this.noteRepository.countInGroup(groupId),
    ]);
    return { total, notes: notes.map(toNoteListEntry) };
  }
}
