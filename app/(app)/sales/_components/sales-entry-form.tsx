"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, CircleDollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BusinessDate } from "@/lib/dates";
import { type DailySalesInput, dailySalesInputSchema } from "@/lib/validation/sales";
import { addDailySales } from "../actions";
import { ENTRY_FIELDS, entryOutcome, recordHref } from "../_lib/entry-errors";
import { formatBusinessDate, formatMoney, formatOrders } from "../_lib/format";
import { Field, controlClass, describedBy } from "./field";

type EntryPlatform = { id: string; name: string; trackingStartDate: BusinessDate };

type Saved = DailySalesInput & { platformName: string };

const CONNECTION_ERROR =
  "Could not save. Check the connection and retry. Your entry is still here.";

/** Add daily sales (design/04, design/14). One platform and one business date per entry. */
export function SalesEntryForm({
  platforms,
  today,
  currency,
  canViewRecords,
  defaults,
}: {
  /** Active platforms only: archived ones accept no new entries. */
  platforms: EntryPlatform[];
  /** Today in the workspace time zone. */
  today: BusinessDate;
  currency: string;
  /** Members with View sales are taken to the existing record on a duplicate date. */
  canViewRecords: boolean;
  defaults?: { platformId?: string; businessDate?: BusinessDate };
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [recordZero, setRecordZero] = useState(false);

  const initialPlatform =
    platforms.find((platform) => platform.id === defaults?.platformId)?.id ??
    (platforms.length === 1 ? platforms[0].id : "");

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    resetField,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DailySalesInput>({
    resolver: zodResolver(dailySalesInputSchema),
    defaultValues: {
      platformId: initialPlatform,
      businessDate: defaults?.businessDate ?? today,
      amount: "",
    },
  });

  const platformIdValue = useWatch({ control, name: "platformId" });
  const selectedPlatform = platforms.find((platform) => platform.id === platformIdValue);

  function toggleZero(checked: boolean) {
    setRecordZero(checked);
    if (checked) {
      setValue("orders", 0, { shouldValidate: true });
      setValue("amount", "0.00", { shouldValidate: true });
    } else {
      resetField("orders");
      resetField("amount");
    }
  }

  async function onSubmit(values: DailySalesInput) {
    setFormError(null);
    setSaved(null);
    let result: Awaited<ReturnType<typeof addDailySales>>;
    try {
      result = await addDailySales(values);
    } catch {
      setFormError(CONNECTION_ERROR);
      return;
    }

    if (result.ok) {
      const platformName = platforms.find((p) => p.id === values.platformId)?.name ?? "";
      setSaved({ ...values, amount: result.value.amount, platformName });
      setRecordZero(false);
      resetField("orders");
      resetField("amount");
      return;
    }

    const outcome = entryOutcome(result, values, canViewRecords);
    if (outcome.type === "open-existing") {
      router.push(outcome.href);
      return;
    }
    for (const field of ENTRY_FIELDS) {
      const message = outcome.fieldErrors[field];
      if (message) setError(field, { type: "server", message });
    }
    if (outcome.formError) setFormError(outcome.formError);
  }

  return (
    <div className="space-y-6">
      {saved ? (
        <Card role="status" className="shadow-none">
          <CardContent className="space-y-2 p-6">
            <p className="text-positive flex items-center gap-2 text-base font-semibold">
              <Check aria-hidden="true" className="size-4" />
              Saved {saved.platformName} · {formatBusinessDate(saved.businessDate)}
            </p>
            <p className="text-muted-foreground text-sm">
              {formatOrders(saved.orders)} · {formatMoney(saved.amount, currency)}
            </p>
            {canViewRecords ? (
              <Link
                href={recordHref(saved.platformId, saved.businessDate)}
                className="text-accent-foreground inline-block text-sm font-semibold hover:underline"
              >
                View record ›
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-none">
        <CardContent className="p-5 sm:p-7">
          <div className="mb-6 hidden sm:block">
            <h2 className="text-xl font-semibold">Daily sales record</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Enter the figures you know for this platform and date.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Field id="platformId" label="Platform" error={errors.platformId?.message}>
                <select
                  id="platformId"
                  className={controlClass}
                  {...describedBy("platformId", errors.platformId?.message)}
                  {...register("platformId")}
                >
                  <option value="" disabled>
                    Choose a platform
                  </option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id="businessDate"
                label="Business date"
                error={errors.businessDate?.message}
                hint={
                  selectedPlatform
                    ? `Tracking since ${formatBusinessDate(selectedPlatform.trackingStartDate)}`
                    : undefined
                }
              >
                <input
                  id="businessDate"
                  type="date"
                  max={today}
                  min={selectedPlatform?.trackingStartDate}
                  className={controlClass}
                  {...describedBy(
                    "businessDate",
                    errors.businessDate?.message,
                    Boolean(selectedPlatform),
                  )}
                  {...register("businessDate")}
                />
              </Field>

              <Field
                id="orders"
                label="Orders"
                error={errors.orders?.message}
                hint="Whole numbers only"
              >
                <input
                  id="orders"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  readOnly={recordZero}
                  className={controlClass}
                  {...describedBy("orders", errors.orders?.message, true)}
                  {...register("orders", { valueAsNumber: true })}
                />
              </Field>

              <Field
                id="amount"
                label="Customer-paid sales amount"
                error={errors.amount?.message}
                hint={currency}
              >
                <div className="relative">
                  <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold">
                    {currency}
                  </span>
                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    readOnly={recordZero}
                    className={`${controlClass} pr-11 pl-16`}
                    {...describedBy("amount", errors.amount?.message, true)}
                    {...register("amount")}
                  />
                  <CircleDollarSign
                    aria-hidden="true"
                    className="text-muted-foreground pointer-events-none absolute inset-y-0 right-4 my-auto size-5"
                  />
                </div>
              </Field>
            </div>

            <div className="border-primary/40 bg-accent/60 rounded-xl border px-6 py-4">
              <p className="text-sm font-semibold">What to enter</p>
              <p className="text-secondary-foreground mt-1 text-sm">
                After discounts, including shipping and tax, before refunds and fees.
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm sm:text-base">
                <input
                  type="checkbox"
                  checked={recordZero}
                  onChange={(event) => toggleZero(event.target.checked)}
                  className="accent-primary size-4"
                />
                Record zero orders and {currency} 0 sales for this date
              </label>
              <p className="text-muted-foreground text-sm">
                This marks the day complete and distinct from missing data.
              </p>
            </div>

            {formError ? (
              <p
                role="alert"
                className="bg-destructive/20 rounded-xl px-4 py-3 text-sm text-[#f08cbd]"
              >
                {formError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {canViewRecords ? (
                <Button asChild variant="outline" size="lg" className="h-11 rounded-xl px-6">
                  <Link href="/sales">Cancel</Link>
                </Button>
              ) : null}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-11 rounded-xl px-6"
              >
                <Check aria-hidden="true" />
                {isSubmitting ? "Saving…" : "Save daily sales"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
