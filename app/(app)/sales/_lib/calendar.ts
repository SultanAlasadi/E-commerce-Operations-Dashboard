import { type BusinessDate, addDays } from "@/lib/dates";
import { isRecordedZero } from "./format";
import { endOfMonth, startOfMonth, weekdayIndex } from "./periods";

/**
 * One calendar cell per day. A missing platform-day is unknown, never zero, so it
 * has its own state, distinct from an explicit 0/0 record.
 *
 * A platform is expected to report a day when the day is on or after its tracking
 * start, before the day it was archived (in the workspace zone), and has ended:
 * today is not counted as missing until the day is over.
 */

export type DayState =
  /** Every expected platform has a record, and at least one is not 0/0. */
  | "recorded"
  /** Every expected platform has a record, and all are 0/0. */
  | "zero"
  /** Some expected platforms have records, others are missing. */
  | "partial"
  /** No records, but at least one platform was expected. */
  | "missing"
  /** Today, not yet recorded. Not missing until the day ends. */
  | "open"
  /** No platform was tracked on this day. */
  | "untracked"
  | "future";

export type CoveragePlatform = {
  id: string;
  trackingStartDate: BusinessDate;
  /** Business date the platform was archived on, or null while active. */
  archivedOn: BusinessDate | null;
};

export type CoverageRecord = {
  platformId: string;
  businessDate: BusinessDate;
  orders: number;
  amount: string;
};

export type CalendarDay = {
  date: BusinessDate;
  state: DayState;
  recorded: number;
  expected: number;
  /** Expected platforms with no record. */
  missing: number;
};

export type CalendarMonth = {
  /** Empty cells before the 1st, for a Monday-first grid. */
  leadingBlanks: number;
  days: CalendarDay[];
};

function tracked(platform: CoveragePlatform, date: BusinessDate): boolean {
  return platform.trackingStartDate <= date && (!platform.archivedOn || date < platform.archivedOn);
}

export function dayState(
  date: BusinessDate,
  platforms: readonly CoveragePlatform[],
  records: readonly CoverageRecord[],
  today: BusinessDate,
): CalendarDay {
  if (date > today) return { date, state: "future", recorded: 0, expected: 0, missing: 0 };

  const onDay = records.filter((record) => record.businessDate === date);
  const recordedIds = new Set(onDay.map((record) => record.platformId));
  const trackedPlatforms = platforms.filter((platform) => tracked(platform, date));
  const expected = date < today ? trackedPlatforms : [];
  const missing = expected.filter((platform) => !recordedIds.has(platform.id)).length;
  const counts = { recorded: onDay.length, expected: expected.length, missing };

  if (onDay.length === 0) {
    if (missing > 0) return { date, state: "missing", ...counts };
    return { date, state: trackedPlatforms.length > 0 ? "open" : "untracked", ...counts };
  }
  if (missing > 0) return { date, state: "partial", ...counts };
  const allZero = onDay.every(isRecordedZero);
  return { date, state: allZero ? "zero" : "recorded", ...counts };
}

/** Each day of an inclusive range, oldest first. */
export function rangeDays(
  from: BusinessDate,
  to: BusinessDate,
  platforms: readonly CoveragePlatform[],
  records: readonly CoverageRecord[],
  today: BusinessDate,
): CalendarDay[] {
  const byDay = new Map<BusinessDate, CoverageRecord[]>();
  for (const record of records) {
    const list = byDay.get(record.businessDate) ?? [];
    list.push(record);
    byDay.set(record.businessDate, list);
  }
  const days: CalendarDay[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push(dayState(day, platforms, byDay.get(day) ?? [], today));
  }
  return days;
}

/** The month containing `date`, with a state for each day. */
export function calendarMonth(
  date: BusinessDate,
  platforms: readonly CoveragePlatform[],
  records: readonly CoverageRecord[],
  today: BusinessDate,
): CalendarMonth {
  const first = startOfMonth(date);
  const last = endOfMonth(date);
  return {
    leadingBlanks: weekdayIndex(first),
    days: rangeDays(first, last, platforms, records, today),
  };
}
