import type { GroupEntity } from "#core/entities/group.entity";
import type { ReminderEntity } from "#core/entities/reminder.entity";
import type { UserEntity } from "#core/entities/user.entity";

/** A reminder with the group and creator needed to post it. */
export type ReminderWithParticipants = ReminderEntity & {
  group: GroupEntity;
  creator: UserEntity;
};

/** When a reminder runs: after a delay, or at a local wall time in the group's zone, once or on a rule. */
export type ReminderTiming =
  | { kind: "relative"; minutes: number }
  | { kind: "wall_time"; at: string; rrule: string | null };

/** A group member's request for a reminder in the group's chat. */
export type CreateReminderInput = {
  groupId: number;
  creatorTelegramId: string;
  text: string;
  timing: ReminderTiming;
  /** The group message that asked for the reminder. */
  sourceMessageId: string;
};

/** What a reminder request stores: its first due time, rule, and the next runs to confirm. */
export type ReminderPlan = {
  dueAt: Date;
  /** Local wall time of the first run; null for a relative reminder. */
  dtstart: string | null;
  rrule: string | null;
  /** The rule in English words; null for a one-time reminder. */
  repeats: string | null;
  runs: Date[];
};

/** Why a reminder's timing can't be planned. */
export type ReminderPlanError =
  | { status: "timezone_required" }
  | { status: "invalid_time" }
  | { status: "in_past" }
  | { status: "invalid_rule" }
  | { status: "too_frequent"; minIntervalMinutes: number };

export type CreateReminderResult =
  | {
      status: "created";
      /** The rule in English words; null for a one-time reminder. */
      repeats: string | null;
      /** The next runs as local wall times ("Mon 2026-11-16 09:00"), or exact UTC times when the zone isn't set. */
      nextRuns: string[];
    }
  | ReminderPlanError
  | { status: "limit_reached"; limit: number };

/** A pending reminder as the agent lists it. */
export type ReminderSummary = {
  id: number;
  text: string;
  createdBy: string;
  nextRun: string;
  repeats: string | null;
};

export type CancelReminderResult = "done" | "not_found" | "forbidden";
