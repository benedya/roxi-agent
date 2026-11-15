import { defineTool } from "eve/tools";
import { z } from "zod";
import { resolve } from "#lib/container";
import {
  CreateReminderService,
  REMINDER_MAX_DELAY_MINUTES,
  REMINDER_RULE_MAX_LENGTH,
  REMINDER_TEXT_MAX_LENGTH,
} from "#core/services/reminders/create-reminder.service";
import type { ReminderTiming } from "#core/types/reminder";
import { getGroupCaller } from "#lib/telegram/group-caller";

export default defineTool({
  description:
    "Create a reminder the bot posts in this chat, once or repeating, as a reply to the request. " +
    "Pass exactly one of inMinutes (a delay: \"in 2 hours\") or at (a clock time in the group's time zone, " +
    "read from \"Time\" for today's date). For a repeating reminder also pass rrule, and pass as `at` the local " +
    "time of its first run. The result has the rule in English words and the next runs: confirm with them in one " +
    "short line, in the chat's language.",
  inputSchema: z.object({
    text: z
      .string()
      .min(1)
      .max(REMINDER_TEXT_MAX_LENGTH)
      .describe("What to remind about, short, in the requester's words and language"),
    inMinutes: z
      .number()
      .int()
      .min(1)
      .max(REMINDER_MAX_DELAY_MINUTES)
      .optional()
      .describe("For a one-time reminder after a delay: minutes from now"),
    at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u)
      .optional()
      .describe("Local wall time in the group's time zone, YYYY-MM-DDTHH:mm, no offset: the run, or a series' first run"),
    rrule: z
      .string()
      .min(1)
      .max(REMINDER_RULE_MAX_LENGTH)
      .optional()
      .describe(
        "For a repeating reminder: an RFC 5545 RRULE without DTSTART, e.g. FREQ=WEEKLY;BYDAY=MO, " +
          "FREQ=MONTHLY;BYDAY=-1FR, FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH, FREQ=DAILY;UNTIL=20261231T235959. " +
          "The time of day comes from `at` unless BYHOUR/BYMINUTE set it.",
      ),
  }),
  async execute({ text, inMinutes, at, rrule }, ctx) {
    const caller = getGroupCaller(ctx.session);
    if (!caller) {
      return { error: "Reminders can only be created in a group chat." };
    }

    if ((inMinutes === undefined) === (at === undefined)) {
      return { error: "Pass exactly one of inMinutes or at." };
    }

    if (rrule !== undefined && at === undefined) {
      return { error: "A repeating reminder needs `at`: the local time of its first run." };
    }

    const timing: ReminderTiming =
      at === undefined ? { kind: "relative", minutes: inMinutes! } : { kind: "wall_time", at, rrule: rrule ?? null };

    const createReminderService = await resolve(CreateReminderService);
    const result = await createReminderService.create({
      groupId: caller.groupId,
      creatorTelegramId: caller.telegramUserId,
      text: text.trim(),
      timing,
      sourceMessageId: caller.messageId,
    });

    switch (result.status) {
      case "created":
        return { created: true, repeats: result.repeats, nextRuns: result.nextRuns };
      case "timezone_required":
        return {
          error:
            "This group has no time zone yet, so clock times can't be placed. Ask which city and country the group " +
            "is in; a group admin must confirm it (set_group_timezone). Delays like \"in 2 hours\" work without it.",
          timezoneRequired: true,
        };
      case "invalid_time":
        return { error: `"${at}" isn't a real date and time.` };
      case "in_past":
        return { error: "That time has already passed (or the rule has no future runs); ask for a later one." };
      case "invalid_rule":
        return { error: `"${rrule}" isn't a valid RRULE.` };
      case "too_frequent":
        return { error: `Repeating reminders must be at least ${result.minIntervalMinutes} minutes apart.` };
      case "limit_reached":
        return {
          error: `The group has reached its limit of ${result.limit} active reminders; cancel one to add another.`,
        };
    }
  },
});
