import { describe, expect, it } from "@jest/globals";
import { describeRule, findNextOccurrence, findNextOccurrences, parseRule } from "#core/helpers/recurrence";

const BERLIN = "Europe/Berlin";
const NEW_YORK = "America/New_York";

function getRule(rrule: string, dtstart: string) {
  const rule = parseRule(rrule, dtstart);
  if (!rule) {
    throw new Error(`Rule "${rrule}" did not parse.`);
  }

  return rule;
}

function toIsoStrings(dates: Date[]): string[] {
  return dates.map((date) => date.toISOString());
}

describe("parseRule", () => {
  it.each(["FREQ=DAILY", "RRULE:FREQ=DAILY", "rrule:FREQ=DAILY"])("parses %s", (rrule) => {
    expect(parseRule(rrule, "2026-11-16T09:00")).not.toBeNull();
  });

  it.each([
    ["a rule without a frequency", "BYDAY=MO", "2026-11-16T09:00"],
    ["a malformed rule", "not a rule", "2026-11-16T09:00"],
    ["an invalid start", "FREQ=DAILY", "16.11.2026 09:00"],
  ])("returns null for %s", (_case, rrule, dtstart) => {
    expect(parseRule(rrule, dtstart)).toBeNull();
  });

  it("anchors the rule at the given start, ignoring DTSTART and TZID in the rule", () => {
    const rule = getRule("DTSTART;TZID=America/New_York:20200101T120000\nRRULE:FREQ=DAILY", "2026-11-16T09:00");

    expect(toIsoStrings(findNextOccurrences(rule, BERLIN, new Date("2026-11-01T00:00:00Z"), 1))).toEqual([
      "2026-11-16T08:00:00.000Z",
    ]);
  });
});

describe("findNextOccurrences", () => {
  it("places local wall times in a zone behind UTC", () => {
    const rule = getRule("FREQ=WEEKLY;BYDAY=MO", "2026-11-02T09:00");

    expect(toIsoStrings(findNextOccurrences(rule, NEW_YORK, new Date("2026-11-15T12:00:00Z"), 2))).toEqual([
      "2026-11-16T14:00:00.000Z",
      "2026-11-23T14:00:00.000Z",
    ]);
  });

  it("keeps the local time across a daylight-saving change", () => {
    const rule = getRule("FREQ=WEEKLY;BYDAY=MO", "2026-10-12T09:00");

    expect(toIsoStrings(findNextOccurrences(rule, BERLIN, new Date("2026-10-13T00:00:00Z"), 2))).toEqual([
      "2026-10-19T07:00:00.000Z",
      "2026-10-26T08:00:00.000Z",
    ]);
  });

  it("moves a run in a skipped hour forward by the jump", () => {
    const rule = getRule("FREQ=DAILY", "2026-03-27T02:30");

    expect(toIsoStrings(findNextOccurrences(rule, BERLIN, new Date("2026-03-27T12:00:00Z"), 3))).toEqual([
      "2026-03-28T01:30:00.000Z",
      "2026-03-29T01:30:00.000Z",
      "2026-03-30T00:30:00.000Z",
    ]);
  });

  it("runs once in a repeated hour, at its first occurrence", () => {
    const rule = getRule("FREQ=DAILY", "2026-10-23T02:30");

    expect(toIsoStrings(findNextOccurrences(rule, BERLIN, new Date("2026-10-23T12:00:00Z"), 3))).toEqual([
      "2026-10-24T00:30:00.000Z",
      "2026-10-25T00:30:00.000Z",
      "2026-10-26T01:30:00.000Z",
    ]);
  });

  it("includes a run later in the current minute and skips one earlier in it", () => {
    const rule = getRule("FREQ=DAILY", "2026-11-16T09:00");

    expect(findNextOccurrences(rule, BERLIN, new Date("2026-11-16T07:59:59Z"), 1)[0]?.toISOString()).toBe(
      "2026-11-16T08:00:00.000Z",
    );
    expect(findNextOccurrences(rule, BERLIN, new Date("2026-11-16T08:00:00Z"), 1)[0]?.toISOString()).toBe(
      "2026-11-17T08:00:00.000Z",
    );
    expect(findNextOccurrences(rule, BERLIN, new Date("2026-11-16T08:00:30Z"), 1)[0]?.toISOString()).toBe(
      "2026-11-17T08:00:00.000Z",
    );
  });

  it("returns fewer runs than asked when the rule ends", () => {
    const rule = getRule("FREQ=DAILY;COUNT=3", "2026-11-16T09:00");

    expect(toIsoStrings(findNextOccurrences(rule, BERLIN, new Date("2026-11-16T09:00:00Z"), 5))).toEqual([
      "2026-11-17T08:00:00.000Z",
      "2026-11-18T08:00:00.000Z",
    ]);
  });
});

describe("findNextOccurrence", () => {
  it("returns the next run", () => {
    const rule = getRule("FREQ=MONTHLY;BYMONTHDAY=1", "2026-01-01T10:00");

    expect(findNextOccurrence(rule, BERLIN, new Date("2026-11-15T00:00:00Z"))?.toISOString()).toBe(
      "2026-12-01T09:00:00.000Z",
    );
  });

  it("returns null when the rule has ended", () => {
    const rule = getRule("FREQ=DAILY;UNTIL=20261117T090000", "2026-11-16T09:00");

    expect(findNextOccurrence(rule, BERLIN, new Date("2026-11-17T09:00:00Z"))).toBeNull();
  });
});

describe("describeRule", () => {
  it("describes the rule in English", () => {
    expect(describeRule(getRule("FREQ=WEEKLY;BYDAY=MO", "2026-11-16T09:00"))).toBe("every week on Monday");
  });
});
