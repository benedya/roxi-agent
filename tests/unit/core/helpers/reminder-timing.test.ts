import { describe, expect, it } from "@jest/globals";
import { findReminderDueAt, formatRunTime } from "#core/helpers/reminder-timing";

const BERLIN = "Europe/Berlin";
const NEW_YORK = "America/New_York";
const AFTER = new Date("2026-11-15T12:00:00Z");

describe("findReminderDueAt", () => {
  it("keeps a relative reminder's due time", () => {
    const dueAt = new Date("2026-11-15T13:30:00Z");

    expect(findReminderDueAt({ dtstart: null, rrule: null, dueAt }, BERLIN, AFTER)).toBe(dueAt);
  });

  it.each([
    [BERLIN, "2026-11-16T08:00:00.000Z"],
    [NEW_YORK, "2026-11-16T14:00:00.000Z"],
  ])("places a one-time wall time in %s", (timezone, expected) => {
    const reminder = { dtstart: "2026-11-16T09:00", rrule: null, dueAt: new Date("2026-11-16T00:00:00Z") };

    expect(findReminderDueAt(reminder, timezone, AFTER)?.toISOString()).toBe(expected);
  });

  it("finds a repeating reminder's next run after the moment", () => {
    const reminder = { dtstart: "2026-11-02T09:00", rrule: "FREQ=WEEKLY;BYDAY=MO", dueAt: new Date("2026-11-09T08:00:00Z") };

    expect(findReminderDueAt(reminder, BERLIN, AFTER)?.toISOString()).toBe("2026-11-16T08:00:00.000Z");
  });

  it.each([
    ["has ended", "FREQ=DAILY;COUNT=3"],
    ["doesn't parse", "BYDAY=MO"],
  ])("returns null when the rule %s", (_case, rrule) => {
    const reminder = { dtstart: "2026-11-01T09:00", rrule, dueAt: new Date("2026-11-03T08:00:00Z") };

    expect(findReminderDueAt(reminder, BERLIN, AFTER)).toBeNull();
  });
});

describe("formatRunTime", () => {
  const RUN = new Date("2026-11-15T23:30:00Z");

  it("shows the local time in the group's zone", () => {
    expect(formatRunTime(RUN, BERLIN)).toBe("Mon 2026-11-16 00:30");
  });

  it("shows UTC, marked as such, when the zone isn't set", () => {
    expect(formatRunTime(RUN, null)).toBe("Sun 2026-11-15 23:30 UTC");
  });
});
