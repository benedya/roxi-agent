import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import { SearchNotesService } from "#core/services/notes/search-notes.service";
import { getGroupCaller, NOT_IN_GROUP_ERROR } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Search this group's notes for a word or phrase in their content or summary. " +
    "Use it when the note a member asks about is not among the notes list_notes returned. " +
    "Returns notes in the same shape as list_notes; call get_note(id) for full text. " +
    "Each note's id is internal: use it only to call get_note, and never show it to members.",
  inputSchema: z.object({
    query: z.string().min(1).describe("A word or short phrase, e.g. 'boat rental'"),
  }),
  async execute({ query }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: NOT_IN_GROUP_ERROR };
    }

    const searchNotesService = await resolve(SearchNotesService);

    return { notes: await searchNotesService.search(caller.groupId, query) };
  },
});
