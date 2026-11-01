// Group notes: members ask the bot to save notes, and the agent loads a compact list of
// the group's newest notes (list_notes) only when a member asks about them. Notes over
// SUMMARY_THRESHOLD chars are summarized by a model call when saved and appear in the list
// only as that summary; the full content reaches the model only through the get_note tool.

import type { NoteContent } from "#core/types/note";
import type { NoteSummarizerService } from "#core/services/notes/note-summarizer.service";

/** Content longer than this is summarized, and the summary stands in for it in note lists. */
export const SUMMARY_THRESHOLD = 100;
export const SUMMARY_MAX_LENGTH = 100;

/** Turns a member's raw note text into what is stored: trimmed, and summarized when long. */
export class NoteContentService {
  private readonly summarizer: NoteSummarizerService;

  constructor(summarizer: NoteSummarizerService) {
    this.summarizer = summarizer;
  }

  async prepare(rawContent: string): Promise<NoteContent> {
    const content = rawContent.trim();

    if (!content) {
      throw new Error("The note is empty.");
    }

    const summary = content.length > SUMMARY_THRESHOLD ? await this.summarizer.summarize(content) : null;
    return { content, summary };
  }
}
