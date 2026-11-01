import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "../lib/container.ts";
import { GetNoteService } from "#core/services/notes/get-note.service";
import { getGroupCaller, NOT_IN_GROUP_ERROR } from "../lib/telegram/group-caller.ts";

export default defineTool({
  description:
    "Get the full content of one of this group's notes by its internal id from list_notes or search_notes. " +
    "Call it only when the member needs details that the note's summary from list_notes or search_notes does not give.",
  inputSchema: z.object({
    id: z.number().int().positive().describe("The note's id from list_notes or search_notes"),
  }),
  async execute({ id }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: NOT_IN_GROUP_ERROR };
    }

    const getNoteService = await resolve(GetNoteService);
    const note = await getNoteService.get(caller.groupId, id);

    return note ?? { error: "That note isn't in this group." };
  },
});
