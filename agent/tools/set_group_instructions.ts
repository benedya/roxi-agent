import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import {
  CUSTOM_INSTRUCTIONS_MAX_LENGTH,
  UpdateGroupInstructionsService,
} from "#core/services/groups/update-group-instructions.service";
import { getGroupCaller } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Replace this group's custom instructions when an admin asks to change how you behave in this chat " +
    "(tone, language, format, and similar). Pass the complete new instructions, not just the change: " +
    "merge the request into the current group instructions, if any. Pass an empty string to clear them. " +
    "Only a group admin can change them.",
  inputSchema: z.object({
    instructions: z
      .string()
      .max(CUSTOM_INSTRUCTIONS_MAX_LENGTH)
      .describe("The complete new instructions, written as short directives; empty to clear them"),
  }),
  async execute({ instructions }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: "Group instructions can only be changed in the group's chat." };
    }

    const updateGroupInstructionsService = await resolve(UpdateGroupInstructionsService);
    const result = await updateGroupInstructionsService.update(caller.groupId, caller.telegramUserId, instructions);

    switch (result) {
      case "done":
        return { updated: true, cleared: instructions.trim() === "" };
      case "forbidden":
        return { error: "Only a group admin can change the group's instructions." };
    }
  },
});
