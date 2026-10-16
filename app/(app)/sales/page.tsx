import Link from "next/link";
import { CalendarDays, Plus, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { can, requireMember, requirePermission } from "@/lib/auth/membership";
import { todayInTimeZone } from "@/lib/dates";
import { listDailySales } from "@/lib/server/sales";
import { EntryPage } from "./_components/entry-page";
import { PeriodFilter } from "./_components/period-filter";
import { PlatformFilter } from "./_components/platform-filter";
import { SalesCalendar } from "./_components/sales-calendar";
import { SalesList } from "./_components/sales-list";
import { StatusBadge } from "./_components/status-badge";
import { calendarMonth, rangeDays } from "./_lib/calendar";
import { formatMoney, sumAmounts } from "./_lib/format";
import { addMonths, endOfMonth, resolvePeriod, startOfMonth } from "./_lib/periods";
import { loadSalesPlatforms } from "./_lib/platforms";
import { salesListHref } from "./_lib/urls";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requireMember();
  const params = await searchParams;
  // Add sales can be entry-only (PLAN §3): those members get the form, not the list.
  if (!can(ctx, "VIEW_SALES") && can(ctx, "ADD_SALES")) {
    return <EntryPage ctx={ctx} searchParams={params} />;
  }
  await requirePermission("VIEW_SALES");

  const { workspace } = ctx;
  const today = todayInTimeZone(workspace.timeZone);
  const platforms = await loadSalesPlatforms(workspace);
  const platformNames = new Map(platforms.map((platform) => [platform.id, platform.name]));

  const platformParam = typeof params.platform === "string" ? params.platform : "";
  const platformId = platformNames.has(platformParam) ? platformParam : "";
  const shownPlatforms = platformId ? platforms.filter((p) => p.id === platformId) : platforms;

  const resolved = resolvePeriod(params, today);
  const calParam = typeof params.cal === "string" ? params.cal : "";
  const calMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(calParam)
    ? `${calParam}-01`
    : startOfMonth(resolved.to < today ? resolved.to : today);

  const [records, calendarRecords] = await Promise.all([
    listDailySales(workspace.id, { from: resolved.from, to: resolved.to, platformId }),
    listDailySales(workspace.id, { from: calMonth, to: endOfMonth(calMonth), platformId }),
  ]);

  // Missing platform-days in the range, up to today. They are unknown, never zero.
  const coverageEnd = resolved.to < today ? resolved.to : today;
  const missing =
    resolved.from <= coverageEnd
      ? rangeDays(resolved.from, coverageEnd, shownPlatforms, records, today).reduce(
          (total, day) => total + day.missing,
          0,
        )
      : 0;
  const total = sumAmounts(records.map((record) => record.amount));
  const orders = records.reduce((sum, record) => sum + record.orders, 0);

  const listParams = {
    period: resolved.period,
    date: resolved.period === "custom" ? undefined : resolved.anchor,
    from: resolved.period === "custom" ? resolved.from : undefined,
    to: resolved.period === "custom" ? resolved.to : undefined,
    platform: platformId,
  };
  const calHref = (month: string) => salesListHref({ ...listParams, cal: month.slice(0, 7) });
  const nextMonth = addMonths(calMonth, 1);
  const canAdd = can(ctx, "ADD_SALES");
  const scopeName = platformId ? platformNames.get(platformId) : "All platforms";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sales</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Daily records by business date and platform
          </p>
        </div>
        {canAdd ? (
          <Button asChild size="lg" className="h-11 rounded-xl px-5">
            <Link href={platformId ? `/sales/new?platform=${platformId}` : "/sales/new"}>
              <Plus aria-hidden="true" /> Add daily sales
            </Link>
          </Button>
        ) : null}
      </div>

      {platforms.length === 0 ? (
        <EmptyState
          title="No platforms"
          description="Sales are recorded per platform. Add your first store or account to begin tracking daily sales."
          action={
            can(ctx, "MANAGE_PLATFORMS") ? (
              <Button asChild>
                <Link href="/platforms">Manage platforms</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <Card className="shadow-none">
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
              <PeriodFilter resolved={resolved} platform={platformId} today={today} />
              <div className="space-y-2">
                <PlatformFilter
                  value={platformId}
                  platforms={platforms.map((p) => ({
                    id: p.id,
                    name: p.name,
                    archived: Boolean(p.archivedOn),
                  }))}
                />
                <p className="text-positive text-xs lg:text-right">
                  Filter applies to list, calendar and totals.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            <Card className="shadow-none">
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-lg font-semibold">
                    <CalendarDays aria-hidden="true" className="size-5" />
                    {resolved.label} · {scopeName}
                  </h2>
                  {records.length > 0 ? (
                    <StatusBadge tone="primary">
                      {formatMoney(total, workspace.currency, { trimZeroCents: true })} recorded ·{" "}
                      {orders.toLocaleString("en-US")} orders
                    </StatusBadge>
                  ) : null}
                </div>

                {missing > 0 ? (
                  <p
                    role="status"
                    className="bg-incomplete/10 text-incomplete flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
                  >
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {missing} platform-{missing === 1 ? "day is" : "days are"} missing in this
                      range. Missing days are unknown, not zero, so the recorded total is partial.
                    </span>
                  </p>
                ) : null}

                {records.length === 0 ? (
                  <p className="text-muted-foreground py-10 text-center text-sm">
                    No entries in this range.
                  </p>
                ) : (
                  <SalesList
                    records={records}
                    platformNames={platformNames}
                    currency={workspace.currency}
                    canEdit={can(ctx, "EDIT_SALES")}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="p-5 sm:p-6">
                <SalesCalendar
                  month={calMonth}
                  calendar={calendarMonth(calMonth, shownPlatforms, calendarRecords, today)}
                  today={today}
                  platformId={platformId || undefined}
                  canAdd={canAdd}
                  prevHref={calHref(addMonths(calMonth, -1))}
                  nextHref={nextMonth <= today ? calHref(nextMonth) : undefined}
                  dayHref={(date) =>
                    salesListHref({
                      period: "day",
                      date,
                      platform: platformId,
                      cal: date.slice(0, 7),
                    })
                  }
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
