import { toNoteListEntry } from "#core/helpers/note-format";
import type { NoteRepository } from "#core/repositories/note.repository";
import type { NoteListEntry } from "#core/types/note";

const SEARCH_LIMIT = 10;

export class SearchNotesService {
  private readonly noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  /** The group's newest notes that contain the text. */
  async search(groupId: number, query: string): Promise<NoteListEntry[]> {
    const notes = await this.noteRepository.search(groupId, query.trim(), SEARCH_LIMIT);
    return notes.map(toNoteListEntry);
  }
}
