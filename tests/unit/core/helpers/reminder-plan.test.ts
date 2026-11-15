import { describe, expect, it } from "@jest/globals";
import { planReminder } from "#core/helpers/reminder-plan";

const BERLIN = "Europe/Berlin";
const NOW = new Date("2026-11-15T12:00:00Z");

function toIsoStrings(dates: Date[]): string[] {
  return dates.map((date) => date.toISOString());
}

describe("planReminder", () => {
  describe("relative timing", () => {
    it("runs once after the delay, without a time zone", () => {
      const dueAt = new Date("2026-11-15T13:30:00Z");

      expect(planReminder({ kind: "relative", minutes: 90 }, null, NOW)).toEqual({
        dueAt,
        dtstart: null,
        rrule: null,
        repeats: null,
        runs: [dueAt],
      });
    });
  });

  describe("wall-time timing", () => {
    it("requires a time zone", () => {
      expect(planReminder({ kind: "wall_time", at: "2026-11-16T09:00", rrule: null }, null, NOW)).toEqual({
        status: "timezone_required",
      });
    });

    it.each(["2026-02-30T09:00", "2026-11-16 09:00"])("rejects the invalid time %s", (at) => {
      expect(planReminder({ kind: "wall_time", at, rrule: null }, BERLIN, NOW)).toEqual({ status: "invalid_time" });
    });

    it("plans a one-time reminder in the group's zone", () => {
      const dueAt = new Date("2026-11-16T08:00:00Z");

      expect(planReminder({ kind: "wall_time", at: "2026-11-16T09:00", rrule: null }, BERLIN, NOW)).toEqual({
        dueAt,
        dtstart: "2026-11-16T09:00",
        rrule: null,
        repeats: null,
        runs: [dueAt],
      });
    });

    it.each([
      ["now", "2026-11-15T13:00"],
      ["in the past", "2026-11-15T12:59"],
    ])("rejects a one-time reminder %s", (_case, at) => {
      expect(planReminder({ kind: "wall_time", at, rrule: null }, BERLIN, NOW)).toEqual({ status: "in_past" });
    });
  });

  describe("repeating timing", () => {
    it("plans the first run, stored rule, description and the runs to confirm", () => {
      const plan = planReminder(
        { kind: "wall_time", at: "2026-11-02T09:00", rrule: "  RRULE:FREQ=WEEKLY;BYDAY=MO  " },
        BERLIN,
        NOW,
      );

      expect(plan).toMatchObject({
        dueAt: new Date("2026-11-16T08:00:00Z"),
        dtstart: "2026-11-02T09:00",
        rrule: "FREQ=WEEKLY;BYDAY=MO",
        repeats: "every week on Monday",
      });
      expect(toIsoStrings((plan as { runs: Date[] }).runs)).toEqual([
        "2026-11-16T08:00:00.000Z",
        "2026-11-23T08:00:00.000Z",
        "2026-11-30T08:00:00.000Z",
        "2026-12-07T08:00:00.000Z",
        "2026-12-14T08:00:00.000Z",
        "2026-12-21T08:00:00.000Z",
      ]);
    });

    it("rejects a rule that doesn't parse", () => {
      expect(planReminder({ kind: "wall_time", at: "2026-11-16T09:00", rrule: "BYDAY=MO" }, BERLIN, NOW)).toEqual({
        status: "invalid_rule",
      });
    });

    it("rejects a rule with no runs left", () => {
      expect(
        planReminder({ kind: "wall_time", at: "2026-11-01T09:00", rrule: "FREQ=DAILY;COUNT=3" }, BERLIN, NOW),
      ).toEqual({ status: "in_past" });
    });

    it("rejects runs closer than an hour apart", () => {
      expect(
        planReminder({ kind: "wall_time", at: "2026-11-16T09:00", rrule: "FREQ=MINUTELY;INTERVAL=59" }, BERLIN, NOW),
      ).toEqual({ status: "too_frequent", minIntervalMinutes: 60 });
    });

    it("accepts runs exactly an hour apart", () => {
      expect(planReminder({ kind: "wall_time", at: "2026-11-16T09:00", rrule: "FREQ=HOURLY" }, BERLIN, NOW)).toMatchObject({
        dueAt: new Date("2026-11-16T08:00:00Z"),
        rrule: "FREQ=HOURLY",
      });
    });
  });
});
