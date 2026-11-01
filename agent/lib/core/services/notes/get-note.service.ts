import { formatNoteAuthor, formatNoteDate } from "#core/helpers/note-format";
import type { NoteRepository } from "#core/repositories/note.repository";

export type NoteDetails = {
  savedBy: string;
  savedOn: string;
  content: string;
};

export class GetNoteService {
  private readonly noteRepository: NoteRepository;

  constructor(noteRepository: NoteRepository) {
    this.noteRepository = noteRepository;
  }

  /** The note's full content, or null when it is not in the group. */
  async get(groupId: number, id: number): Promise<NoteDetails | null> {
    const note = await this.noteRepository.findInGroup(groupId, id);
    return note ? { savedBy: formatNoteAuthor(note), savedOn: formatNoteDate(note.createdAt), content: note.content } : null;
  }
}
