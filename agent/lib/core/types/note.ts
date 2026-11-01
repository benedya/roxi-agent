/** A note's text as stored: the summary is set only for long content. */
export type NoteContent = {
  content: string;
  summary: string | null;
};

/** A note as the agent sees it in lists: the full text of a short note, the summary of a long one. */
export type NoteListEntry = {
  /** Internal: for get_note only. */
  id: number;
  savedBy: string;
  savedOn: string;
  text: string;
  /** True when text is a summary; get_note has the full content. */
  summarized: boolean;
};

/** Outcome of an edit or delete: only the note's author and the group's admins may change a note. */
export type NoteChangeResult = "done" | "not_found" | "forbidden";
