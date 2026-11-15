import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import { CancelReminderService } from "#core/services/reminders/cancel-reminder.service";
import { getGroupCaller } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Cancel one of this group's active reminders; for a repeating one, this ends the whole series. " +
    "Only the member who created it or a group admin can cancel it. " +
    "The id comes from list_reminders and is internal: never show it to members.",
  inputSchema: z.object({
    id: z.number().int().positive().describe("The reminder's id from list_reminders"),
  }),
  async execute({ id }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: "Reminders are only available in a group chat." };
    }

    const cancelReminderService = await resolve(CancelReminderService);
    const result = await cancelReminderService.cancel(caller.groupId, id, caller.telegramUserId);

    switch (result) {
      case "done":
        return { cancelled: true };
      case "not_found":
        return { error: "That reminder isn't active in this group." };
      case "forbidden":
        return { error: "Only the member who created this reminder or a group admin can cancel it." };
    }
  },
});
