// Turns a reminder request's timing into what is stored: its first due time, rule, and the runs to confirm.

import { describeRule, findNextOccurrences, parseRule } from "#core/helpers/recurrence";
import { isValidWallTime, toInstant } from "#core/helpers/timezone";
import type { ReminderPlan, ReminderPlanError, ReminderTiming } from "#core/types/reminder";

/** The shortest gap between two runs of a repeating reminder, so a rule can't flood the chat. */
const MIN_INTERVAL_MINUTES = 60;
/** Runs compared for the gap check; the first few are shown to confirm the rule. */
const CHECKED_RUNS = 6;

/** Wall-clock timings need the group's time zone; a delay doesn't. */
export function planReminder(timing: ReminderTiming, timezone: string | null, now: Date): ReminderPlan | ReminderPlanError {
  if (timing.kind === "relative") {
    const dueAt = new Date(now.getTime() + timing.minutes * 60_000);

    return { dueAt, dtstart: null, rrule: null, repeats: null, runs: [dueAt] };
  }

  if (!timezone) {
    return { status: "timezone_required" };
  }

  if (!isValidWallTime(timing.at)) {
    return { status: "invalid_time" };
  }

  if (timing.rrule === null) {
    const dueAt = toInstant(timing.at, timezone);

    return dueAt.getTime() <= now.getTime()
      ? { status: "in_past" }
      : { dueAt, dtstart: timing.at, rrule: null, repeats: null, runs: [dueAt] };
  }

  const rrule = timing.rrule.trim().replace(/^RRULE:/iu, "");
  const rule = parseRule(rrule, timing.at);

  if (!rule) {
    return { status: "invalid_rule" };
  }

  const runs = findNextOccurrences(rule, timezone, now, CHECKED_RUNS);

  if (runs.length === 0) {
    return { status: "in_past" };
  }

  if (runs.some((run, index) => index > 0 && run.getTime() - runs[index - 1]!.getTime() < MIN_INTERVAL_MINUTES * 60_000)) {
    return { status: "too_frequent", minIntervalMinutes: MIN_INTERVAL_MINUTES };
  }

  return { dueAt: runs[0]!, dtstart: timing.at, rrule, repeats: describeRule(rule), runs };
}
