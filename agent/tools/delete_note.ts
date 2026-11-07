import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import { DeleteNoteService } from "#core/services/notes/delete-note.service";
import { getGroupCaller, NOT_IN_GROUP_ERROR } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Delete one of this group's notes for good when a member asks to delete or remove it. " +
    "Only the note's author or a group admin can delete it. " +
    "The id comes from list_notes or search_notes and is internal: never show it to members.",
  inputSchema: z.object({
    id: z.number().int().positive().describe("The note's id from list_notes or search_notes"),
  }),
  async execute({ id }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: NOT_IN_GROUP_ERROR };
    }

    const deleteNoteService = await resolve(DeleteNoteService);
    const result = await deleteNoteService.delete(caller.groupId, id, caller.telegramUserId);

    switch (result) {
      case "done":
        return { deleted: true };
      case "not_found":
        return { error: "That note isn't in this group." };
      case "forbidden":
        return { error: "Only the member who saved this note or a group admin can delete it." };
    }
  },
});
