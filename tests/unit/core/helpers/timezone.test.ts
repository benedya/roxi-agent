import { describe, expect, it } from "@jest/globals";
import {
  formatLocalTime,
  isValidTimezone,
  isValidWallTime,
  toInstant,
  toWallTime,
  wallTimeToUtcMs,
} from "#core/helpers/timezone";

const BERLIN = "Europe/Berlin";
const NEW_YORK = "America/New_York";

describe("isValidTimezone", () => {
  it.each(["Europe/Berlin", "UTC"])("accepts %s", (timezone) => {
    expect(isValidTimezone(timezone)).toBe(true);
  });

  it.each(["Mars/Olympus", ""])("rejects %j", (timezone) => {
    expect(isValidTimezone(timezone)).toBe(false);
  });
});

describe("isValidWallTime", () => {
  it.each(["2026-11-16T09:00", "2028-02-29T00:00", "2026-12-31T23:59"])("accepts %s", (wallTime) => {
    expect(isValidWallTime(wallTime)).toBe(true);
  });

  it.each([
    ["a day that doesn't exist", "2026-02-29T09:00"],
    ["month 13", "2026-13-01T09:00"],
    ["hour 24", "2026-11-16T24:00"],
    ["minute 60", "2026-11-16T09:60"],
    ["a single-digit hour", "2026-11-16T9:00"],
    ["seconds", "2026-11-16T09:00:00"],
    ["a space separator", "2026-11-16 09:00"],
  ])("rejects %s", (_case, wallTime) => {
    expect(isValidWallTime(wallTime)).toBe(false);
  });
});

describe("toWallTime", () => {
  it.each([
    ["in winter", "2026-11-16T08:00:59Z", BERLIN, "2026-11-16T09:00"],
    ["in summer", "2026-07-01T08:00:00Z", BERLIN, "2026-07-01T10:00"],
    ["after local midnight", "2026-11-15T23:30:00Z", BERLIN, "2026-11-16T00:30"],
    ["before local midnight, behind UTC", "2026-11-16T03:00:00Z", NEW_YORK, "2026-11-15T22:00"],
  ])("reads the local time %s", (_case, iso, timezone, expected) => {
    expect(toWallTime(new Date(iso), timezone)).toBe(expected);
  });
});

describe("toInstant", () => {
  it.each([
    ["in winter", "2026-11-16T09:00", BERLIN, "2026-11-16T08:00:00.000Z"],
    ["in summer", "2026-07-01T10:00", BERLIN, "2026-07-01T08:00:00.000Z"],
    ["behind UTC", "2026-11-15T22:00", NEW_YORK, "2026-11-16T03:00:00.000Z"],
    ["with a half-hour offset", "2026-11-16T09:00", "Asia/Kolkata", "2026-11-16T03:30:00.000Z"],
  ])("finds the moment of a local time %s", (_case, wallTime, timezone, expected) => {
    expect(toInstant(wallTime, timezone).toISOString()).toBe(expected);
  });

  it.each([
    [BERLIN, "2026-03-29T02:30", "2026-03-29T01:30:00.000Z"],
    [NEW_YORK, "2026-03-08T02:30", "2026-03-08T07:30:00.000Z"],
  ])("moves a time skipped in %s forward by the jump", (timezone, wallTime, expected) => {
    expect(toInstant(wallTime, timezone).toISOString()).toBe(expected);
  });

  it.each([
    [BERLIN, "2026-10-25T02:30", "2026-10-25T00:30:00.000Z"],
    [NEW_YORK, "2026-11-01T01:30", "2026-11-01T05:30:00.000Z"],
  ])("resolves a time repeated in %s to its first occurrence", (timezone, wallTime, expected) => {
    expect(toInstant(wallTime, timezone).toISOString()).toBe(expected);
  });
});

describe("formatLocalTime", () => {
  it("shows the local weekday, date and time", () => {
    expect(formatLocalTime(new Date("2026-11-16T08:00:00Z"), BERLIN)).toBe("Mon 2026-11-16 09:00");
  });

  it("takes the weekday from the local date, not the UTC one", () => {
    expect(formatLocalTime(new Date("2026-11-15T23:30:00Z"), BERLIN)).toBe("Mon 2026-11-16 00:30");
  });
});

describe("wallTimeToUtcMs", () => {
  it("reads the wall time as UTC", () => {
    expect(wallTimeToUtcMs("2026-11-16T09:00")).toBe(Date.UTC(2026, 10, 16, 9, 0));
  });

  it("throws on a malformed wall time", () => {
    expect(() => wallTimeToUtcMs("2026-11-16 09:00")).toThrow('Invalid wall time "2026-11-16 09:00".');
  });
});
