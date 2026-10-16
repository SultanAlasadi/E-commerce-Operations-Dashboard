import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/membership";
import { isBusinessDate } from "@/lib/dates";
import { getSalesHistory, listDailySales } from "@/lib/server/sales";
import { RecordStatus, StatusBadge } from "../../../_components/status-badge";
import { recordHref } from "../../../_lib/entry-errors";
import {
  formatBusinessDate,
  formatMoment,
  formatMoney,
  formatOrders,
  isRecordedZero,
} from "../../../_lib/format";
import { loadSalesPlatforms } from "../../../_lib/platforms";

const ACTIONS = {
  CREATED: { label: "Created", tone: "positive" },
  CORRECTED: { label: "Corrected", tone: "primary" },
  DELETED: { label: "Deleted", tone: "danger" },
} as const;

function figures(orders: number | null, amount: Prisma.Decimal | null, currency: string) {
  if (orders === null || amount === null) return "No record";
  return `${formatOrders(orders)} · ${formatMoney(amount.toFixed(2), currency, { trimZeroCents: true })}`;
}

/** Audit timeline for one platform-day, across deletes and re-creates (design/06). */
export default async function SalesHistoryPage({
  params,
}: {
  params: Promise<{ platformId: string; date: string }>;
}) {
  const ctx = await requirePermission("VIEW_SALES");
  const { platformId, date } = await params;
  if (!isBusinessDate(date)) notFound();

  const { workspace } = ctx;
  const platform = (await loadSalesPlatforms(workspace)).find((p) => p.id === platformId);
  if (!platform) notFound();

  const [[record], history] = await Promise.all([
    listDailySales(workspace.id, { from: date, to: date, platformId }),
    getSalesHistory(workspace.id, platformId, date),
  ]);

  const entries = history.map((entry) => ({
    id: entry.id,
    when: formatMoment(entry.createdAt, workspace.timeZone),
    who: `${entry.actor.displayName}${entry.actor.removedAt ? " (removed)" : ""}`,
    action: ACTIONS[entry.action],
    before: figures(entry.beforeOrders, entry.beforeAmount, workspace.currency),
    after: figures(entry.afterOrders, entry.afterAmount, workspace.currency),
    reason: entry.reason,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sales audit history</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            {platform.name} · {formatBusinessDate(date)} · {workspace.timeZone}
          </p>
        </div>
        <Button asChild variant="outline" className="h-11 rounded-xl px-5">
          <Link href={recordHref(platformId, date)}>
            <ArrowLeft aria-hidden="true" /> Back to record
          </Link>
        </Button>
      </div>

      <Card className="shadow-none">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-muted-foreground text-sm">Current record</p>
            {record ? (
              <p className="mt-1 flex flex-wrap gap-x-8 text-2xl font-semibold sm:text-3xl">
                <span>{formatOrders(record.orders)}</span>
                <span>{formatMoney(record.amount, workspace.currency)}</span>
              </p>
            ) : (
              <p className="mt-1 text-2xl font-semibold sm:text-3xl">No record</p>
            )}
          </div>
          {record ? (
            <RecordStatus zero={isRecordedZero(record)} />
          ) : (
            <StatusBadge tone="warning">Missing</StatusBadge>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <History aria-hidden="true" className="size-5" /> Change history
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Who changed or deleted a record, when, and what changed
            </p>
          </div>

          {entries.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No changes have been recorded for this day.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b text-left text-xs font-semibold tracking-[0.08em] uppercase">
                      <th scope="col" className="px-3 py-3">
                        When
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Who
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Action
                      </th>
                      <th scope="col" className="px-3 py-3">
                        Before
                      </th>
                      <th scope="col" className="px-3 py-3">
                        After
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-b align-top">
                        <td className="px-3 py-4 whitespace-nowrap">{entry.when}</td>
                        <td className="px-3 py-4">{entry.who}</td>
                        <td className="px-3 py-4">
                          <StatusBadge tone={entry.action.tone}>{entry.action.label}</StatusBadge>
                          {entry.reason ? (
                            <p className="text-muted-foreground mt-2 max-w-60 text-xs">
                              “{entry.reason}”
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">{entry.before}</td>
                        <td className="px-3 py-4 font-semibold whitespace-nowrap">{entry.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ol className="space-y-3 md:hidden">
                {entries.map((entry) => (
                  <li key={entry.id} className="bg-background/40 space-y-3 rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{entry.who}</p>
                        <p className="text-muted-foreground text-xs">{entry.when}</p>
                      </div>
                      <StatusBadge tone={entry.action.tone}>{entry.action.label}</StatusBadge>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Before</dt>
                      <dd>{entry.before}</dd>
                      <dt className="text-muted-foreground">After</dt>
                      <dd className="font-semibold">{entry.after}</dd>
                    </dl>
                    {entry.reason ? (
                      <p className="text-muted-foreground text-xs">“{entry.reason}”</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
