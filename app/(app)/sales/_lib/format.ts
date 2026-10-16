import type { BusinessDate } from "@/lib/dates";

/**
 * Display helpers for the sales screens. Amounts stay decimal strings ("4860.00")
 * end to end; Intl.NumberFormat formats the string itself, so no float rounding.
 */

export function formatMoney(
  amount: string,
  currency: string,
  options: { trimZeroCents?: boolean } = {},
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...(options.trimZeroCents ? { trailingZeroDisplay: "stripIfInteger" } : {}),
  }).format(amount as unknown as number);
}

const AMOUNT = /^(\d+)(?:\.(\d{1,2}))?$/;

/** Adds decimal amount strings exactly, using integer minor units. */
export function sumAmounts(amounts: readonly string[]): string {
  const HUNDRED = BigInt(100);
  let cents = BigInt(0);
  for (const amount of amounts) {
    const match = AMOUNT.exec(amount.trim());
    if (!match) throw new Error(`Invalid amount: ${amount}`);
    cents += BigInt(match[1]) * HUNDRED + BigInt((match[2] ?? "").padEnd(2, "0"));
  }
  const whole = cents / HUNDRED;
  const fraction = (cents % HUNDRED).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function isZeroAmount(amount: string): boolean {
  return /^0+(\.0+)?$/.test(amount.trim());
}

// Business dates are UTC-midnight calendar days, so they are formatted in UTC.
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const monthYear = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const utc = (date: BusinessDate) => new Date(`${date}T00:00:00.000Z`);

/** "13 Oct" */
export const formatDayMonth = (date: BusinessDate) => dayMonth.format(utc(date));
/** "13 Oct 2026" */
export const formatBusinessDate = (date: BusinessDate) => dayMonthYear.format(utc(date));
/** "October 2026" */
export const formatMonthYear = (date: BusinessDate) => monthYear.format(utc(date));

/** A moment shown in the workspace time zone: "13 Oct 2026 · 09:18 EDT". */
export function formatMoment(moment: Date, timeZone: string): string {
  const part = (locale: string, options: Intl.DateTimeFormatOptions, type: string) =>
    new Intl.DateTimeFormat(locale, { timeZone, ...options })
      .formatToParts(moment)
      .find((p) => p.type === type)?.value ?? "";
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(moment);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(moment);
  // en-US gives familiar abbreviations (EDT) where they exist, GMT+3 otherwise.
  const zone = part("en-US", { timeZoneName: "short" }, "timeZoneName");
  return `${date} · ${time} ${zone}`;
}

export function formatOrders(orders: number): string {
  return `${new Intl.NumberFormat("en-US").format(orders)} ${orders === 1 ? "order" : "orders"}`;
}

/** An explicit 0 orders / 0 amount record: a confirmed zero, distinct from missing. */
export function isRecordedZero(record: { orders: number; amount: string }): boolean {
  return record.orders === 0 && isZeroAmount(record.amount);
}
