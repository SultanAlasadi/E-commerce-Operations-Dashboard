import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BusinessDate } from "@/lib/dates";
import type { CalendarDay, CalendarMonth, DayState } from "../_lib/calendar";
import { recordHref } from "../_lib/entry-errors";
import { formatBusinessDate, formatMonthYear } from "../_lib/format";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const STATE_LABEL: Record<DayState, string> = {
  recorded: "Recorded",
  zero: "Recorded zero",
  partial: "Partly recorded",
  missing: "Missing",
  open: "Today, not recorded yet",
  untracked: "Not tracked",
  future: "Future",
};

const cellClass: Record<DayState, string> = {
  recorded: "bg-positive/15 text-foreground",
  zero: "bg-positive/10 text-foreground ring-1 ring-inset ring-positive/40",
  partial: "bg-incomplete/10 text-foreground ring-1 ring-inset ring-incomplete/50",
  missing: "text-incomplete border border-dashed border-incomplete/60",
  open: "text-foreground",
  untracked: "text-muted-foreground/60",
  future: "text-muted-foreground/40",
};

/** The marker under each date; shapes differ so state never relies on colour alone. */
function Marker({ state, className }: { state: DayState; className?: string }) {
  const base = cn("block size-1.5 shrink-0", className);
  switch (state) {
    case "recorded":
      return <span aria-hidden="true" className={cn(base, "bg-positive rounded-full")} />;
    case "zero":
      return <span aria-hidden="true" className={cn(base, "border-positive rotate-45 border")} />;
    case "partial":
      return (
        <span
          aria-hidden="true"
          className={cn(
            base,
            "border-incomplete rounded-full border bg-linear-to-r from-[var(--incomplete)] from-50% to-transparent to-50%",
          )}
        />
      );
    case "missing":
      return (
        <span aria-hidden="true" className={cn(base, "border-incomplete rounded-full border")} />
      );
    default:
      return <span aria-hidden="true" className={base} />;
  }
}

/**
 * One cell per day (design/03): recorded, recorded zero, missing, or partly recorded
 * when several platforms are shown. Missing never looks like a zero.
 */
export function SalesCalendar({
  month,
  calendar,
  today,
  platformId,
  canAdd,
  prevHref,
  nextHref,
  dayHref,
}: {
  month: BusinessDate;
  calendar: CalendarMonth;
  today: BusinessDate;
  /** Set when one platform is selected: cells then open that platform's record. */
  platformId?: string;
  canAdd: boolean;
  prevHref: string;
  nextHref?: string;
  /** For all platforms: the list filtered to one day. */
  dayHref: (date: BusinessDate) => string;
}) {
  function hrefFor(day: CalendarDay): string | undefined {
    if (day.state === "future" || day.state === "untracked") return undefined;
    if (!platformId) return dayHref(day.date);
    if (day.state === "recorded" || day.state === "zero") return recordHref(platformId, day.date);
    return canAdd ? `/sales/new?platform=${platformId}&date=${day.date}` : undefined;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays aria-hidden="true" className="size-5" />
          {formatMonthYear(month)}
        </h2>
        <div className="flex">
          <Button asChild variant="ghost" size="icon" aria-label="Previous month">
            <Link href={prevHref} scroll={false}>
              <ChevronLeft aria-hidden="true" />
            </Link>
          </Button>
          {nextHref ? (
            <Button asChild variant="ghost" size="icon" aria-label="Next month">
              <Link href={nextHref} scroll={false}>
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" size="icon" aria-label="Next month" disabled>
              <ChevronRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center text-sm">
        {WEEKDAYS.map((day, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="text-muted-foreground py-2 text-xs font-semibold"
          >
            {day}
          </div>
        ))}
        {Array.from({ length: calendar.leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} />
        ))}
        {calendar.days.map((day) => {
          const href = hrefFor(day);
          const counts =
            day.expected > 1 || day.state === "partial"
              ? ` (${day.recorded} of ${Math.max(day.expected, day.recorded)} platforms)`
              : "";
          const label = `${formatBusinessDate(day.date)}: ${STATE_LABEL[day.state]}${counts}`;
          const content = (
            <>
              <span className="tabular-nums">{Number(day.date.slice(8, 10))}</span>
              <Marker state={day.state} className="mt-1" />
            </>
          );
          const className = cn(
            "flex h-12 flex-col items-center justify-center rounded-xl transition-colors",
            cellClass[day.state],
            day.date === today && "outline-ring outline-2 -outline-offset-2 outline",
            href && "hover:bg-accent",
          );
          return (
            <div key={day.date}>
              {href ? (
                <Link href={href} aria-label={label} title={label} className={className}>
                  {content}
                </Link>
              ) : (
                <span aria-label={label} title={label} className={className}>
                  {content}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ul className="text-muted-foreground mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t pt-5 text-xs">
        {(["recorded", "missing", "zero", ...(platformId ? [] : ["partial"])] as DayState[]).map(
          (state) => (
            <li key={state} className="flex items-center gap-2">
              <Marker state={state} />
              {STATE_LABEL[state]}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
