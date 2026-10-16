"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workspaceSettingsSchema } from "@/lib/validation/workspace";
import { saveWorkspaceSettings } from "./actions";

type Values = z.input<typeof workspaceSettingsSchema>;
const inputClass =
  "bg-secondary/50 border-input focus-visible:ring-ring h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2";

export function SettingsForm({
  initial,
  setupComplete,
}: {
  initial: Values;
  setupComplete: boolean;
}) {
  const [message, setMessage] = useState("");
  const [currencyError, setCurrencyError] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: initial,
  });
  const currencies = Intl.supportedValuesOf("currency");
  const timeZones = Intl.supportedValuesOf("timeZone");

  async function onSubmit(values: Values) {
    setMessage("");
    setCurrencyError("");
    const result = await saveWorkspaceSettings(values);
    if (!result.ok) {
      if (result.error === "CURRENCY_LOCKED") setCurrencyError(result.message);
      else if (result.error === "INVALID" && result.details?.fieldErrors) {
        const errors = result.details.fieldErrors as Record<string, string>;
        for (const [field, text] of Object.entries(errors)) {
          if (field === "name" || field === "currency" || field === "timeZone")
            form.setError(field, { message: text });
        }
      } else setMessage(result.message);
      return;
    }
    form.reset(values);
    setMessage("Workspace settings saved.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Workspace details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="workspace-name" className="text-sm font-medium">
                Workspace name
              </label>
              <input
                id="workspace-name"
                className={inputClass}
                {...form.register("name")}
                aria-invalid={Boolean(form.formState.errors.name)}
              />
              {form.formState.errors.name && (
                <p className="text-destructive-foreground text-sm">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="workspace-currency" className="text-sm font-medium">
                Reporting currency
              </label>
              <select
                id="workspace-currency"
                className={inputClass}
                {...form.register("currency")}
                aria-invalid={Boolean(form.formState.errors.currency || currencyError)}
              >
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              {form.formState.errors.currency && (
                <p className="text-destructive-foreground text-sm">
                  {form.formState.errors.currency.message}
                </p>
              )}
              {currencyError && (
                <p role="alert" className="text-sm text-[#ffd08a]">
                  {currencyError}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                Changing currency after sales exist requires a data migration.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="workspace-time-zone" className="text-sm font-medium">
                IANA time zone
              </label>
              <select
                id="workspace-time-zone"
                className={inputClass}
                {...form.register("timeZone")}
                aria-invalid={Boolean(form.formState.errors.timeZone)}
              >
                {!timeZones.includes(initial.timeZone) && (
                  <option value={initial.timeZone}>{initial.timeZone}</option>
                )}
                {timeZones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
              {form.formState.errors.timeZone && (
                <p className="text-destructive-foreground text-sm">
                  {form.formState.errors.timeZone.message}
                </p>
              )}
              <p className="text-muted-foreground text-xs">Business dates use this time zone.</p>
            </div>
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Check />
                {form.formState.isSubmitting ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="h-fit shadow-none">
        <CardHeader>
          <CardTitle>{setupComplete ? "Reporting setup" : "Initial setup"}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-3 text-sm">
          <p>
            {setupComplete
              ? "These settings define how sales are reported across the workspace."
              : "Choose the workspace name, currency and IANA time zone before recording a sale."}
          </p>
          <p>Currency changes are unavailable after sales have been recorded.</p>
        </CardContent>
      </Card>
    </div>
  );
}
