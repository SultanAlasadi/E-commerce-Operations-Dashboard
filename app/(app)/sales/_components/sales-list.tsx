import Link from "next/link";
import { Pencil } from "lucide-react";
import type { DailySalesRecord } from "@/lib/server/sales";
import { historyHref, recordHref } from "../_lib/entry-errors";
import { formatDayMonth, formatMoney, formatOrders, isRecordedZero } from "../_lib/format";
import { RecordStatus } from "./status-badge";

/** Recorded entries: a table on desktop (design/03), cards on phones (design/13). */
export function SalesList({
  records,
  platformNames,
  currency,
  canEdit,
}: {
  records: DailySalesRecord[];
  platformNames: ReadonlyMap<string, string>;
  currency: string;
  canEdit: boolean;
}) {
  const name = (id: string) => platformNames.get(id) ?? "Unknown platform";

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs font-semibold tracking-[0.08em] uppercase">
              <th scope="col" className="px-3 py-3">
                Business date
              </th>
              <th scope="col" className="px-3 py-3">
                Platform
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Orders
              </th>
              <th scope="col" className="px-3 py-3 text-right">
                Sales
              </th>
              <th scope="col" className="px-3 py-3">
                Status
              </th>
              <th scope="col" className="px-3 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b">
                <td className="px-3 py-4 whitespace-nowrap">
                  {formatDayMonth(record.businessDate)}
                </td>
                <td className="px-3 py-4">{name(record.platformId)}</td>
                <td className="px-3 py-4 text-right tabular-nums">
                  {record.orders.toLocaleString("en-US")}
                </td>
                <td className="px-3 py-4 text-right font-semibold whitespace-nowrap tabular-nums">
                  {formatMoney(record.amount, currency, { trimZeroCents: true })}
                </td>
                <td className="px-3 py-4">
                  <RecordStatus zero={isRecordedZero(record)} />
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <Link
                    href={recordHref(record.platformId, record.businessDate)}
                    className="text-accent-foreground inline-flex items-center gap-1.5 font-semibold hover:underline"
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                    {canEdit ? "Edit" : "View"}
                  </Link>
                  <span className="text-muted-foreground"> · </span>
                  <Link
                    href={historyHref(record.platformId, record.businessDate)}
                    className="text-accent-foreground font-semibold hover:underline"
                  >
                    History
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {records.map((record) => (
          <li key={record.id}>
            <Link
              href={recordHref(record.platformId, record.businessDate)}
              className="bg-background/40 hover:border-ring block rounded-2xl border p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{formatDayMonth(record.businessDate)}</p>
                  <p className="text-muted-foreground mt-1 truncate text-sm">
                    {name(record.platformId)} · {formatOrders(record.orders)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-lg font-semibold whitespace-nowrap tabular-nums">
                    {formatMoney(record.amount, currency, { trimZeroCents: true })}
                  </p>
                  <RecordStatus zero={isRecordedZero(record)} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
