import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import { SetGroupTimezoneService } from "#core/services/groups/set-group-timezone.service";
import { getGroupCaller } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Set this group's time zone, used for reminders at a clock time. Work out the IANA zone from the city and " +
    "country a member gives; when a country spans several zones or a city name is ambiguous, ask which one first. " +
    "The result's localTime is the current time there: confirm the zone with it in one short line. " +
    "Only a group admin can set it. Pending reminders keep their clock time in the new zone.",
  inputSchema: z.object({
    timezone: z.string().min(1).max(64).describe("The IANA time zone name, e.g. Europe/Kyiv or America/New_York"),
  }),
  async execute({ timezone }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: "The time zone can only be set in the group's chat." };
    }

    const setGroupTimezoneService = await resolve(SetGroupTimezoneService);
    const result = await setGroupTimezoneService.set(caller.groupId, caller.telegramUserId, timezone.trim());

    switch (result.status) {
      case "done":
        return { updated: true, timezone: timezone.trim(), localTime: result.localTime };
      case "invalid_timezone":
        return { error: `"${timezone}" isn't an IANA time zone name; pass one like Europe/Kyiv.` };
      case "forbidden":
        return { error: "Only a group admin can set the group's time zone." };
    }
  },
});
