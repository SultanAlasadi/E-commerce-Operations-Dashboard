/**
 * Business dates are plain calendar days ("YYYY-MM-DD") in the workspace's IANA
 * time zone. They are stored in Postgres as DATE, which Prisma maps to a JS Date
 * at UTC midnight. Never derive a business date from the server's local time.
 */

export type BusinessDate = string;

const BUSINESS_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isBusinessDate(value: string): value is BusinessDate {
  if (!BUSINESS_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The current calendar day in `timeZone`. `now` is injectable for tests. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): BusinessDate {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Converts a business date to the value Prisma expects for a @db.Date column. */
export function toDbDate(date: BusinessDate): Date {
  if (!isBusinessDate(date)) throw new Error(`Invalid business date: ${date}`);
  return new Date(`${date}T00:00:00.000Z`);
}

/** Converts a @db.Date value read through Prisma back to a business date. */
export function fromDbDate(date: Date): BusinessDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: BusinessDate, days: number): BusinessDate {
  const value = toDbDate(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromDbDate(value);
}
