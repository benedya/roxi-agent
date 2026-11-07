import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import { SaveNoteService } from "#core/services/notes/save-note.service";
import { env } from "#lib/env";
import { getGroupCaller, NOT_IN_GROUP_ERROR } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Save a note for this group when a member asks you to remember or save something. " +
    "Store the content as the member gave it, without rewriting it. " +
    "Long notes are summarized automatically for the group's notes list.",
  inputSchema: z.object({
    content: z.string().min(1).describe("The full text of the note"),
  }),
  async execute({ content }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: NOT_IN_GROUP_ERROR };
    }

    const saveNoteService = await resolve(SaveNoteService);
    const result = await saveNoteService.save(caller.groupId, caller.telegramUserId, content);

    switch (result) {
      case "saved":
        return { saved: true };
      case "limit_reached":
        return {
          error: `This group already has ${env.MAX_NOTES_PER_GROUP} notes, the most it can keep. Delete an old note to save a new one.`,
        };
    }
  },
});
