// Plain-data views of notes for the agent: results are data rather than preformatted
// text, so the model words its own replies instead of echoing the list.

import type { NoteEntity } from "#core/entities/note.entity";
import type { NoteListEntry } from "#core/types/note";

export function toNoteListEntry(note: NoteEntity): NoteListEntry {
  return {
    id: note.id,
    savedBy: formatNoteAuthor(note),
    savedOn: formatNoteDate(note.createdAt),
    text: note.summary ?? note.content,
    summarized: note.summary !== null,
  };
}

export function formatNoteAuthor(note: NoteEntity): string {
  const author = note.author;
  if (!author) {
    return "unknown";
  }
  return author.username ? `@${author.username}` : (author.firstName ?? "unknown");
}

export function formatNoteDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
