// The group's time zone and current local time, on every turn, so the agent can turn "tomorrow at 9"
// or "next Monday" into a wall time for create_reminder.

import { defineDynamic, defineInstructions } from "eve/instructions";
import { resolve } from "#lib/container";
import { FindGroupTimezoneService } from "#core/services/groups/find-group-timezone.service";
import { formatLocalTime } from "#core/helpers/timezone";
import { getGroupCaller } from "#lib/telegram/group-caller";

export default defineDynamic({
  events: {
    "turn.started": async (_event, ctx) => {
      const caller = getGroupCaller(ctx.session);
      if (!caller) {
        return null;
      }

      const findGroupTimezoneService = await resolve(FindGroupTimezoneService);
      const timezone = await findGroupTimezoneService.find(caller.groupId);
      const now = new Date();

      return defineInstructions({
        content: [
          "# Time",
          "",
          timezone
            ? `Group time zone: ${timezone}. Current local time: ${formatLocalTime(now, timezone)}.`
            : `This group's time zone isn't set. Current UTC time: ${formatLocalTime(now, "UTC")}.`,
        ].join("\n"),
      });
    },
  },
});
