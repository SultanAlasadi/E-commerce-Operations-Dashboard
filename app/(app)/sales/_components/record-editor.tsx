"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CircleDollarSign, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type DailySalesCorrection, dailySalesCorrectionSchema } from "@/lib/validation/sales";
import { correctSales, deleteSales } from "../actions";
import { formatMoney, formatOrders } from "../_lib/format";
import { Field, controlClass, describedBy } from "./field";
import { StatusBadge } from "./status-badge";

type EditableRecord = { id: string; orders: number; amount: string; updatedAt: string };

type SaveProblem =
  /** Someone else changed or deleted the record first. */
  | { kind: "stale"; message: string }
  /** The request itself failed; nothing was saved. */
  | { kind: "connection" }
  | { kind: "rejected"; message: string };

/** Correct and delete one record (design/05). Values stay in the form after any failure. */
export function RecordEditor({
  record,
  summary,
  currency,
  canEdit,
  canDelete,
  deletedHref,
}: {
  record: EditableRecord;
  /** "Shopify US · 13 Oct 2026" */
  summary: string;
  currency: string;
  canEdit: boolean;
  canDelete: boolean;
  /** Where to go after a delete. */
  deletedHref: string;
}) {
  const router = useRouter();
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState<DailySalesCorrection | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteProblem, setDeleteProblem] = useState<SaveProblem | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DailySalesCorrection>({
    resolver: zodResolver(dailySalesCorrectionSchema),
    defaultValues: { orders: record.orders, amount: record.amount, reason: "" },
  });

  async function onSubmit(values: DailySalesCorrection) {
    setProblem(null);
    setSaved(false);
    setSubmitted(values);
    let result: Awaited<ReturnType<typeof correctSales>>;
    try {
      result = await correctSales(record.id, values, record.updatedAt);
    } catch {
      setProblem({ kind: "connection" });
      return;
    }
    if (result.ok) {
      setSaved(true);
      router.refresh();
      return;
    }
    switch (result.error) {
      case "STALE":
      case "NOT_FOUND":
        setProblem({ kind: "stale", message: result.message });
        return;
      case "INVALID": {
        const fieldErrors = (result.details?.fieldErrors ?? {}) as Record<string, string>;
        for (const field of ["orders", "amount", "reason"] as const) {
          if (fieldErrors[field]) setError(field, { type: "server", message: fieldErrors[field] });
        }
        return;
      }
      default:
        setProblem({ kind: "rejected", message: result.message });
    }
  }

  async function onDelete() {
    setDeleteProblem(null);
    setDeleting(true);
    try {
      const result = await deleteSales(record.id, record.updatedAt);
      if (result.ok) {
        router.replace(deletedHref);
        router.refresh();
        return;
      }
      setDeleteProblem(
        result.error === "STALE" || result.error === "NOT_FOUND"
          ? { kind: "stale", message: result.message }
          : { kind: "rejected", message: result.message },
      );
    } catch {
      setDeleteProblem({ kind: "connection" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="shadow-none">
        <CardContent className="space-y-6 p-5 sm:p-7">
          <div className="border-primary/40 bg-accent/60 rounded-xl border px-6 py-4">
            <p className="text-sm font-semibold">Current values</p>
            <p className="text-secondary-foreground mt-1 flex flex-wrap gap-x-6 text-sm">
              <span>{formatOrders(record.orders)}</span>
              <span>{formatMoney(record.amount, currency)}</span>
            </p>
          </div>

          {canEdit ? (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <Field id="orders" label="Corrected orders" error={errors.orders?.message}>
                <input
                  id="orders"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  className={controlClass}
                  {...describedBy("orders", errors.orders?.message)}
                  {...register("orders", { valueAsNumber: true })}
                />
              </Field>
              <Field id="amount" label="Corrected sales" error={errors.amount?.message}>
                <div className="relative">
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold">
                    {currency}
                  </span>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={`${controlClass} pr-11 pl-16`}
                    {...describedBy("amount", errors.amount?.message)}
                    {...register("amount")}
                  />
                  <CircleDollarSign
                    aria-hidden="true"
                    className="text-muted-foreground pointer-events-none absolute inset-y-0 right-4 my-auto size-5"
                  />
                </div>
              </Field>
              <Field
                id="reason"
                label="Reason for correction"
                error={errors.reason?.message}
                hint="Optional. Saved in the audit history."
              >
                <input
                  id="reason"
                  type="text"
                  maxLength={500}
                  className={controlClass}
                  {...describedBy("reason", errors.reason?.message, true)}
                  {...register("reason")}
                />
              </Field>

              {saved ? (
                <p role="status" className="text-positive flex items-center gap-2 text-sm">
                  <Check aria-hidden="true" className="size-4" /> Correction saved.
                </p>
              ) : null}

              <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="text-accent-foreground self-start text-sm font-semibold hover:underline"
                  >
                    Delete record
                  </button>
                ) : (
                  <span />
                )}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl px-6"
                >
                  <Check aria-hidden="true" />
                  {isSubmitting ? "Saving…" : "Save correction"}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-muted-foreground text-sm">
              You can view this record. Correcting it needs the Edit sales permission.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {problem ? (
          <Card role="alert" className="shadow-none">
            <CardContent className="space-y-4 p-6">
              <StatusBadge tone="danger">Could not save</StatusBadge>
              <h2 className="text-lg font-semibold">Your edits are still here</h2>
              {submitted ? (
                <p className="text-muted-foreground text-sm">
                  {formatOrders(submitted.orders)} · {formatMoney(submitted.amount, currency)}
                </p>
              ) : null}
              <p className="text-muted-foreground text-sm">
                {problem.kind === "connection"
                  ? "Check the connection and retry. The saved record has not changed."
                  : problem.message}
              </p>
              {problem.kind === "connection" ? (
                <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                  <RefreshCw aria-hidden="true" /> Retry save
                </Button>
              ) : problem.kind === "stale" ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setProblem(null);
                    router.refresh();
                  }}
                >
                  <RefreshCw aria-hidden="true" /> Reload current record
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {canDelete && (confirming || deleteProblem) ? (
          <Card className="shadow-none">
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">Delete this record?</h2>
              <p className="text-muted-foreground text-sm">
                {summary}
                <br />
                {formatOrders(record.orders)} · {formatMoney(record.amount, currency)}
              </p>
              <p className="text-muted-foreground text-sm">
                The day becomes missing. Audit history retains the deletion.
              </p>
              {deleteProblem ? (
                <p role="alert" className="text-danger text-sm">
                  {deleteProblem.kind === "connection"
                    ? "Could not delete. Check the connection and retry. The record has not changed."
                    : deleteProblem.message}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                {deleteProblem?.kind === "stale" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDeleteProblem(null);
                      setConfirming(false);
                      router.refresh();
                    }}
                  >
                    <RefreshCw aria-hidden="true" /> Reload current record
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConfirming(false);
                        setDeleteProblem(null);
                      }}
                      disabled={deleting}
                    >
                      Keep record
                    </Button>
                    <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                      <Trash2 aria-hidden="true" /> {deleting ? "Deleting…" : "Delete"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {canDelete && !canEdit && !confirming && !deleteProblem ? (
          <Button variant="outline" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" /> Delete record
          </Button>
        ) : null}
      </div>
    </div>
  );
}
