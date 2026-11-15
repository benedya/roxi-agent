// Repeating reminder rules (RFC 5545 RRULE). Rules are evaluated in "floating" time, where a Date's UTC fields
// hold the local wall time, so rrule never applies a zone itself; each result is then placed in the group's zone.
// This keeps "every Monday at 09:00" at 09:00 local time across daylight-saving changes.

import * as rruleModule from "rrule";
import { toInstant, toWallTime, wallTimeToUtcMs } from "#core/helpers/timezone";

// rrule ships CommonJS for Node and ESM for bundlers: Node exposes its exports only as the default export.
const { RRule } = ("RRule" in rruleModule ? rruleModule : (rruleModule as { default: typeof rruleModule }).default);

type RRule = InstanceType<typeof RRule>;

/** The rule anchored at a local wall time; null when the rule doesn't parse or has no frequency. */
export function parseRule(rrule: string, dtstart: string): RRule | null {
  try {
    const { dtstart: _ignoredStart, tzid: _ignoredZone, ...options } = RRule.parseString(rrule.replace(/^RRULE:/iu, ""));

    if (options.freq === undefined) {
      return null;
    }

    return new RRule({ ...options, dtstart: new Date(wallTimeToUtcMs(dtstart)), tzid: null });
  } catch {
    return null;
  }
}

/** The first run strictly after the moment, or null when the rule has ended. */
export function findNextOccurrence(rule: RRule, timezone: string, after: Date): Date | null {
  return findNextOccurrences(rule, timezone, after, 1)[0] ?? null;
}

/** Up to count runs strictly after the moment, in order. */
export function findNextOccurrences(rule: RRule, timezone: string, after: Date, count: number): Date[] {
  const occurrences: Date[] = [];
  let cursor = new Date(wallTimeToUtcMs(toWallTime(after, timezone)));

  while (occurrences.length < count) {
    const next = rule.after(cursor, false);

    if (!next) {
      break;
    }

    const instant = toInstant(next.toISOString().slice(0, 16), timezone);
    // The wall time is to the minute, so a run in the current minute is already past.
    if (instant.getTime() > after.getTime()) {
      occurrences.push(instant);
    }
    cursor = next;
  }

  return occurrences;
}

/** The rule in English words ("every week on Monday"), for the agent to confirm in the chat's language. */
export function describeRule(rule: RRule): string {
  return rule.toText();
}
