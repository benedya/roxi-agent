// When a stored reminder runs next, from its rule or wall time and the group's time zone.

import type { ReminderEntity } from "#core/entities/reminder.entity";
import { findNextOccurrence, parseRule } from "#core/helpers/recurrence";
import { formatLocalTime, toInstant } from "#core/helpers/timezone";

/**
 * The reminder's next run after the moment: the rule's next occurrence, or the one-time wall time
 * placed in the zone. Null when a rule has ended or doesn't parse; relative reminders keep their due time.
 */
export function findReminderDueAt(
  reminder: Pick<ReminderEntity, "rrule" | "dtstart" | "dueAt">,
  timezone: string,
  after: Date,
): Date | null {
  if (reminder.dtstart === null) {
    return reminder.dueAt;
  }

  if (reminder.rrule === null) {
    return toInstant(reminder.dtstart, timezone);
  }

  const rule = parseRule(reminder.rrule, reminder.dtstart);

  return rule ? findNextOccurrence(rule, timezone, after) : null;
}

/** A run time for the agent: local time in the group's zone, or UTC when the zone isn't set. */
export function formatRunTime(date: Date, timezone: string | null): string {
  return timezone ? formatLocalTime(date, timezone) : `${formatLocalTime(date, "UTC")} UTC`;
}
