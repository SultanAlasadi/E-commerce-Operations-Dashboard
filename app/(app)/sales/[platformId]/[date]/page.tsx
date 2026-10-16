import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, History, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/membership";
import { isBusinessDate, todayInTimeZone } from "@/lib/dates";
import { getSalesHistory, listDailySales } from "@/lib/server/sales";
import { RecordEditor } from "../../_components/record-editor";
import { StatusBadge } from "../../_components/status-badge";
import { historyHref, recordHref } from "../../_lib/entry-errors";
import { formatBusinessDate, formatMoment } from "../../_lib/format";
import { loadSalesPlatforms } from "../../_lib/platforms";

/** One platform-day: correct or delete its record, or see that it is missing. */
export default async function SalesRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ platformId: string; date: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePermission("VIEW_SALES");
  const { platformId, date } = await params;
  const { from } = await searchParams;
  if (!isBusinessDate(date)) notFound();

  const { workspace } = ctx;
  const platform = (await loadSalesPlatforms(workspace)).find((p) => p.id === platformId);
  if (!platform) notFound();

  const [[record], history] = await Promise.all([
    listDailySales(workspace.id, { from: date, to: date, platformId }),
    getSalesHistory(workspace.id, platformId, date),
  ]);
  const lastChange = record ? history[0] : undefined;
  const summary = `${platform.name} · ${formatBusinessDate(date)}`;
  const today = todayInTimeZone(workspace.timeZone);
  const canAddHere =
    can(ctx, "ADD_SALES") &&
    !platform.archivedOn &&
    date >= platform.trackingStartDate &&
    date <= today;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/sales?platform=${platformId}&period=month&date=${date}`}
            className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft aria-hidden="true" className="size-4" /> Sales
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {record && can(ctx, "EDIT_SALES") ? "Correct daily sales" : "Daily sales"}
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">{summary}</p>
        </div>
        <Button asChild variant="outline" className="h-11 rounded-xl px-5">
          <Link href={historyHref(platformId, date)}>
            <History aria-hidden="true" /> History
          </Link>
        </Button>
      </div>

      {from === "duplicate" && record ? (
        <p
          role="status"
          className="bg-positive/15 text-positive flex items-start gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          An entry already exists for this platform and date. Correct its current record below.
        </p>
      ) : null}
      {from === "deleted" && !record ? (
        <p
          role="status"
          className="bg-positive/15 text-positive flex items-start gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Record deleted. The audit history keeps its values.
        </p>
      ) : null}

      {record ? (
        <div className="space-y-4">
          {lastChange ? (
            <p className="text-muted-foreground text-sm">
              Last changed by {lastChange.actor.displayName}
              {lastChange.actor.removedAt ? " (removed)" : ""} ·{" "}
              {formatMoment(lastChange.createdAt, workspace.timeZone)}
            </p>
          ) : null}
          <RecordEditor
            record={{
              id: record.id,
              orders: record.orders,
              amount: record.amount,
              updatedAt: record.updatedAt.toISOString(),
            }}
            summary={summary}
            currency={workspace.currency}
            canEdit={can(ctx, "EDIT_SALES")}
            canDelete={can(ctx, "DELETE_SALES")}
            deletedHref={`${recordHref(platformId, date)}?from=deleted`}
          />
        </div>
      ) : (
        <Card className="max-w-3xl shadow-none">
          <CardContent className="space-y-4 p-6 sm:p-7">
            <StatusBadge tone="warning">No record</StatusBadge>
            <p className="text-muted-foreground text-sm">
              {date < platform.trackingStartDate
                ? `This date is before ${platform.name}'s tracking start date (${formatBusinessDate(platform.trackingStartDate)}).`
                : "Nothing is recorded for this platform and date. The day is unknown, not zero."}
            </p>
            {canAddHere ? (
              <Button asChild>
                <Link href={`/sales/new?platform=${platformId}&date=${date}`}>
                  <Plus aria-hidden="true" /> Add daily sales
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
