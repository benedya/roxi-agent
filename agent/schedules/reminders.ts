// Posts due reminders every minute; the reminders themselves are rows in the database.

import { defineSchedule } from "eve/schedules";
import { resolve } from "#lib/container";
import { DispatchDueRemindersService } from "#core/services/reminders/dispatch-due-reminders.service";

export default defineSchedule({
  cron: "* * * * *",
  run({ waitUntil }) {
    waitUntil(
      (async () => {
        const dispatchDueRemindersService = await resolve(DispatchDueRemindersService);
        await dispatchDueRemindersService.dispatchDue(new Date());
      })(),
    );
  },
});
