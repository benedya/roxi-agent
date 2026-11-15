import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import { ListRemindersService } from "#core/services/reminders/list-reminders.service";
import { getGroupCaller } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "List this group's active reminders, soonest first, with their next run in the group's time zone and, " +
    "for repeating ones, the rule in English words. Call it when a member asks about reminders, or before " +
    "cancelling one. Each reminder's id is internal: use it only to call cancel_reminder, and never show it.",
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: "Reminders are only available in a group chat." };
    }

    const listRemindersService = await resolve(ListRemindersService);

    return { reminders: await listRemindersService.getPending(caller.groupId) };
  },
});
