import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "../lib/container.ts";
import { EditNoteService } from "#core/services/notes/edit-note.service";
import { getGroupCaller, NOT_IN_GROUP_ERROR } from "../lib/telegram/group-caller.ts";

export default defineTool({
  description:
    "Replace the content of one of this group's notes when a member asks to edit, change, or correct it. " +
    "Pass the complete new text, not just the change: call get_note first when the note is summarized. " +
    "Only the note's author or a group admin can edit it. " +
    "The id comes from list_notes or search_notes and is internal: never show it to members.",
  inputSchema: z.object({
    id: z.number().int().positive().describe("The note's id from list_notes or search_notes"),
    content: z.string().min(1).describe("The complete new text of the note"),
  }),
  async execute({ id, content }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: NOT_IN_GROUP_ERROR };
    }

    const editNoteService = await resolve(EditNoteService);
    const result = await editNoteService.edit(caller.groupId, id, caller.telegramUserId, content);

    switch (result) {
      case "done":
        return { updated: true };
      case "not_found":
        return { error: "That note isn't in this group." };
      case "forbidden":
        return { error: "Only the member who saved this note or a group admin can edit it." };
    }
  },
});
