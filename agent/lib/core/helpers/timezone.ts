// Converts between exact moments and local wall times ("2026-11-16T09:00") in an IANA time zone, with Intl only.

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const WALL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u;

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** True for a well-formed "YYYY-MM-DDTHH:mm" that names a real calendar date and time. */
export function isValidWallTime(wallTime: string): boolean {
  const match = WALL_TIME_PATTERN.exec(wallTime);
  if (!match) {
    return false;
  }

  const [, year, month, day, hour, minute] = match.map(Number) as [number, number, number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
  );
}

/** The local wall time of a moment in the zone, to the minute. */
export function toWallTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? "00";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/**
 * The moment a wall time happens in the zone. A time skipped by a daylight-saving jump
 * moves forward by the jump; a repeated one resolves to its first occurrence.
 */
export function toInstant(wallTime: string, timezone: string): Date {
  const wallAsUtc = wallTimeToUtcMs(wallTime);
  // A zone changes its offset at most once within a day, so the offsets a day either side cover both candidates.
  const candidates = [...new Set([findOffsetMs(wallAsUtc - DAY_MS, timezone), findOffsetMs(wallAsUtc + DAY_MS, timezone)])]
    .map((offset) => wallAsUtc - offset)
    .sort((a, b) => a - b);
  const matching = candidates.find((candidate) => toWallTime(new Date(candidate), timezone) === wallTime);

  return new Date(matching ?? candidates[candidates.length - 1]!);
}

/** "Fri 2026-11-13 14:32": a moment as local time in the zone, for the agent to read. */
export function formatLocalTime(date: Date, timezone: string): string {
  const weekday = new Intl.DateTimeFormat("en", { timeZone: timezone, weekday: "short" }).format(date);

  return `${weekday} ${toWallTime(date, timezone).replace("T", " ")}`;
}

/** The wall time read as if it were UTC, in milliseconds. */
export function wallTimeToUtcMs(wallTime: string): number {
  const [, year, month, day, hour, minute] = (WALL_TIME_PATTERN.exec(wallTime) ?? []).map(Number);

  if (year === undefined || month === undefined || day === undefined || hour === undefined || minute === undefined) {
    throw new Error(`Invalid wall time "${wallTime}".`);
  }

  return Date.UTC(year, month - 1, day, hour, minute);
}

/** The zone's UTC offset at the moment, in milliseconds. */
function findOffsetMs(utcMs: number, timezone: string): number {
  const minuteMs = Math.floor(utcMs / MINUTE_MS) * MINUTE_MS;

  return wallTimeToUtcMs(toWallTime(new Date(minuteMs), timezone)) - minuteMs;
}
