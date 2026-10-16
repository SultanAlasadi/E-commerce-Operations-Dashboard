import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PERIODS, type ResolvedPeriod, shiftAnchor } from "../_lib/periods";
import { salesListHref } from "../_lib/urls";
import { controlClass } from "./field";

const LABELS = { day: "Day", week: "Week", month: "Month", year: "Year", custom: "Custom" };

/** Day / Week / Month / Year / Custom (design/03). Links, so it works without JS. */
export function PeriodFilter({
  resolved,
  platform,
  today,
}: {
  resolved: ResolvedPeriod;
  platform: string;
  today: string;
}) {
  const { period, anchor } = resolved;
  const next = shiftAnchor(period, anchor, 1);
  const atLatest = period !== "custom" && resolved.to >= today;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Period" className="flex flex-wrap gap-2">
          {PERIODS.map((value) => (
            <Link
              key={value}
              href={salesListHref({
                period: value,
                date: value === "custom" ? undefined : anchor,
                from: value === "custom" ? resolved.from : undefined,
                to: value === "custom" ? resolved.to : undefined,
                platform,
              })}
              aria-current={value === period ? "page" : undefined}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                value === period
                  ? "bg-accent text-foreground font-semibold"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {LABELS[value]}
            </Link>
          ))}
        </nav>
        <p className="text-muted-foreground hidden text-xs lg:ml-2 lg:block">
          Inclusive custom dates · Monday-first weeks
        </p>
      </div>

      {period === "custom" ? (
        <form action="/sales" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="period" value="custom" />
          {platform ? <input type="hidden" name="platform" value={platform} /> : null}
          <label className="space-y-1 text-xs font-semibold">
            <span className="block">From</span>
            <input
              type="date"
              name="from"
              defaultValue={resolved.from}
              max={today}
              required
              className={cn(controlClass, "h-10 w-auto")}
            />
          </label>
          <label className="space-y-1 text-xs font-semibold">
            <span className="block">To</span>
            <input
              type="date"
              name="to"
              defaultValue={resolved.to}
              max={today}
              required
              className={cn(controlClass, "h-10 w-auto")}
            />
          </label>
          <Button type="submit" variant="secondary" className="h-10 rounded-xl">
            Apply
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Previous period">
            <Link href={salesListHref({ period, date: shiftAnchor(period, anchor, -1), platform })}>
              <ChevronLeft aria-hidden="true" />
            </Link>
          </Button>
          <p className="min-w-40 text-center text-sm font-semibold">{resolved.label}</p>
          {atLatest ? (
            <Button variant="ghost" size="icon" aria-label="Next period" disabled>
              <ChevronRight aria-hidden="true" />
            </Button>
          ) : (
            <Button asChild variant="ghost" size="icon" aria-label="Next period">
              <Link href={salesListHref({ period, date: next, platform })}>
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
