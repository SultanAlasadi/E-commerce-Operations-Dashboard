import { type BusinessDate, addDays, isBusinessDate } from "@/lib/dates";
import { formatBusinessDate, formatDayMonth, formatMonthYear } from "./format";

/**
 * The list's date range, read from the URL. Calendar weeks start Monday and custom
 * ranges are inclusive (PLAN §2). Everything is plain business-date arithmetic.
 */

export const PERIODS = ["day", "week", "month", "year", "custom"] as const;
export type Period = (typeof PERIODS)[number];

export type DateRange = { from: BusinessDate; to: BusinessDate };

export type ResolvedPeriod = DateRange & {
  period: Period;
  /** The day the period was built around; prev/next move it. */
  anchor: BusinessDate;
  label: string;
};

/** Longest custom range, to keep a single page of results reasonable. */
export const MAX_CUSTOM_DAYS = 366;

const year = (date: BusinessDate) => Number(date.slice(0, 4));
const month = (date: BusinessDate) => Number(date.slice(5, 7));
const pad = (value: number) => String(value).padStart(2, "0");

export function startOfMonth(date: BusinessDate): BusinessDate {
  return `${date.slice(0, 7)}-01`;
}

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

export function endOfMonth(date: BusinessDate): BusinessDate {
  return `${date.slice(0, 7)}-${pad(daysInMonth(year(date), month(date)))}`;
}

/** Moves by whole months, clamping the day to the target month's length. */
export function addMonths(date: BusinessDate, months: number): BusinessDate {
  const index = year(date) * 12 + (month(date) - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(y, m));
  return `${y}-${pad(m)}-${pad(day)}`;
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: BusinessDate): number {
  return (new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

export function daysBetween(from: BusinessDate, to: BusinessDate): number {
  const ms = Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`);
  return Math.round(ms / 86_400_000);
}

function rangeFor(period: Exclude<Period, "custom">, anchor: BusinessDate): DateRange {
  switch (period) {
    case "day":
      return { from: anchor, to: anchor };
    case "week": {
      const from = addDays(anchor, -weekdayIndex(anchor));
      return { from, to: addDays(from, 6) };
    }
    case "month":
      return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case "year":
      return { from: `${year(anchor)}-01-01`, to: `${year(anchor)}-12-31` };
  }
}

function labelFor(period: Period, { from, to }: DateRange): string {
  switch (period) {
    case "day":
      return formatBusinessDate(from);
    case "month":
      return formatMonthYear(from);
    case "year":
      return String(year(from));
    default:
      return year(from) === year(to)
        ? `${formatDayMonth(from)} – ${formatBusinessDate(to)}`
        : `${formatBusinessDate(from)} – ${formatBusinessDate(to)}`;
  }
}

type Params = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

/** Reads period, date, from and to from the URL. Invalid values fall back to this month. */
export function resolvePeriod(params: Params, today: BusinessDate): ResolvedPeriod {
  const requested = single(params.period);
  const period: Period = PERIODS.includes(requested as Period) ? (requested as Period) : "month";

  if (period === "custom") {
    const from = single(params.from);
    const to = single(params.to);
    if (
      from &&
      to &&
      isBusinessDate(from) &&
      isBusinessDate(to) &&
      from <= to &&
      daysBetween(from, to) < MAX_CUSTOM_DAYS
    ) {
      return { period, from, to, anchor: to, label: labelFor(period, { from, to }) };
    }
    // An incomplete custom range shows the last 30 days, ready to adjust.
    const range = { from: addDays(today, -29), to: today };
    return { period, ...range, anchor: today, label: labelFor(period, range) };
  }

  const date = single(params.date);
  const anchor = date && isBusinessDate(date) ? date : today;
  const range = rangeFor(period, anchor);
  return { period, ...range, anchor, label: labelFor(period, range) };
}

/** The anchor one period earlier (-1) or later (+1). Not used for custom ranges. */
export function shiftAnchor(period: Period, anchor: BusinessDate, step: -1 | 1): BusinessDate {
  switch (period) {
    case "day":
      return addDays(anchor, step);
    case "week":
      return addDays(anchor, 7 * step);
    case "month":
      return addMonths(anchor, step);
    case "year":
      return addMonths(anchor, 12 * step);
    default:
      return anchor;
  }
}
