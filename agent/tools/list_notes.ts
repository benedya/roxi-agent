import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import { ListRecentNotesService } from "#core/services/notes/list-recent-notes.service";
import { getGroupCaller, NOT_IN_GROUP_ERROR } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "List this group's newest saved notes. Call it only when a member asks about the group's notes " +
    "or about something they saved earlier. Short notes are shown in full, long notes only as a summary; " +
    "call get_note(id) for a long note's full text. " +
    "Each note's id is internal: use it only to call get_note, and never show it to members. " +
    "Reply in your own words; don't copy the result's fields or layout.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: NOT_IN_GROUP_ERROR };
    }

    const listRecentNotesService = await resolve(ListRecentNotesService);

    return listRecentNotesService.listRecent(caller.groupId);
  },
});
