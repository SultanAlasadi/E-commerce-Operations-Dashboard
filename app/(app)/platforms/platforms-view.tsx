"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { EmptyState } from "@/components/states/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { platformInputSchema } from "@/lib/validation/workspace";
import { addPlatform, archivePlatform, editPlatform, restorePlatform } from "./actions";

type FormInput = z.input<typeof platformInputSchema>;
type FormOutput = z.output<typeof platformInputSchema>;
type Platform = {
  id: string;
  name: string;
  provider: string | null;
  trackingStartDate: string;
  archived: boolean;
};
const inputClass =
  "bg-secondary/50 border-input focus-visible:ring-ring h-11 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2";
const sheetClass =
  "max-h-[90dvh] overflow-y-auto rounded-t-2xl p-6 md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:border";

function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function PlatformsView({ platforms, today }: { platforms: Platform[]; today: string }) {
  const [editing, setEditing] = useState<Platform | "new" | null>(null);
  const [confirming, setConfirming] = useState<Platform | null>(null);
  const [actionError, setActionError] = useState("");
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(platformInputSchema),
    defaultValues: { name: "", provider: "", trackingStartDate: today },
  });

  function openForm(platform: Platform | "new") {
    setActionError("");
    form.reset(
      platform === "new"
        ? { name: "", provider: "", trackingStartDate: today }
        : {
            name: platform.name,
            provider: platform.provider ?? "",
            trackingStartDate: platform.trackingStartDate,
          },
    );
    setEditing(platform);
  }

  async function submit(values: FormOutput) {
    setActionError("");
    const input = { ...values, provider: values.provider ?? "" };
    const result =
      editing === "new"
        ? await addPlatform(input)
        : editing
          ? await editPlatform(editing.id, input)
          : null;
    if (!result) return;
    if (!result.ok) {
      if (result.error === "NAME_TAKEN") form.setError("name", { message: result.message });
      else if (result.error === "START_AFTER_SALES")
        form.setError("trackingStartDate", { message: result.message });
      else if (result.error === "INVALID" && result.details?.fieldErrors) {
        const errors = result.details.fieldErrors as Record<string, string>;
        for (const [field, text] of Object.entries(errors)) {
          if (field === "name" || field === "provider" || field === "trackingStartDate")
            form.setError(field, { message: text });
        }
      } else
        setActionError(
          result.error === "NOT_FOUND"
            ? "This platform no longer exists. Refresh the page."
            : result.message,
        );
      return;
    }
    setEditing(null);
  }

  async function changeArchived() {
    if (!confirming) return;
    setActionError("");
    const result = confirming.archived
      ? await restorePlatform(confirming.id)
      : await archivePlatform(confirming.id);
    if (!result.ok) {
      setActionError(
        result.error === "NOT_FOUND"
          ? "This platform no longer exists. Refresh the page."
          : result.message,
      );
      return;
    }
    setConfirming(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Platforms</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Each store or account has its own reporting history.
          </p>
        </div>
        <Button onClick={() => openForm("new")}>
          <Plus /> Add platform
        </Button>
      </div>

      {platforms.length === 0 ? (
        <EmptyState
          title="No platforms yet"
          description="Add your first store or account to begin tracking daily sales."
          action={
            <Button onClick={() => openForm("new")}>
              <Plus /> Add platform
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden shadow-none">
          <CardContent className="p-0">
            <div className="text-muted-foreground hidden grid-cols-[1.3fr_1fr_1fr_0.8fr_1fr] gap-4 border-b px-6 py-4 text-xs font-semibold tracking-wide uppercase md:grid">
              <span>Platform</span>
              <span>Provider</span>
              <span>Tracking start</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {platforms.map((platform) => (
              <div
                key={platform.id}
                className="grid gap-3 border-b px-6 py-5 last:border-0 md:grid-cols-[1.3fr_1fr_1fr_0.8fr_1fr] md:items-center md:gap-4"
              >
                <strong className="text-sm">{platform.name}</strong>
                <span className="text-muted-foreground text-sm">
                  <span className="md:hidden">Provider: </span>
                  {platform.provider || "—"}
                </span>
                <span className="text-muted-foreground text-sm">
                  <span className="md:hidden">Tracking start: </span>
                  {displayDate(platform.trackingStartDate)}
                </span>
                <Badge
                  className={`w-fit ${platform.archived ? "bg-accent text-accent-foreground" : "bg-positive-soft text-positive"}`}
                >
                  {platform.archived ? "Archived" : "Active"}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openForm(platform)}>
                    <Pencil /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActionError("");
                      setConfirming(platform);
                    }}
                  >
                    {platform.archived ? "Restore" : "Archive"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Sheet
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <SheetContent side="bottom" className={sheetClass}>
          <SheetHeader className="mb-6 text-left">
            <SheetTitle>{editing === "new" ? "Add platform" : "Edit platform"}</SheetTitle>
            <SheetDescription>One platform represents one store or account.</SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="platform-name" className="text-sm font-medium">
                Platform name
              </label>
              <input
                id="platform-name"
                className={inputClass}
                {...form.register("name")}
                aria-invalid={Boolean(form.formState.errors.name)}
              />
              {form.formState.errors.name && (
                <p className="text-danger text-sm">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="platform-provider" className="text-sm font-medium">
                Provider (optional)
              </label>
              <input
                id="platform-provider"
                className={inputClass}
                {...form.register("provider")}
                aria-invalid={Boolean(form.formState.errors.provider)}
                placeholder="e.g. Shopify"
              />
              {form.formState.errors.provider && (
                <p className="text-danger text-sm">{form.formState.errors.provider.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="platform-start" className="text-sm font-medium">
                Tracking start date
              </label>
              <input
                id="platform-start"
                type="date"
                className={inputClass}
                {...form.register("trackingStartDate")}
                aria-invalid={Boolean(form.formState.errors.trackingStartDate)}
              />
              {form.formState.errors.trackingStartDate && (
                <p className="text-danger text-sm">
                  {form.formState.errors.trackingStartDate.message}
                </p>
              )}
              <p className="text-muted-foreground text-xs">Coverage starts on this calendar day.</p>
            </div>
            {actionError && (
              <p role="alert" className="text-danger text-sm">
                {actionError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save platform"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <SheetContent side="bottom" className={sheetClass}>
          <SheetHeader className="mb-6 text-left">
            <SheetTitle>
              {confirming?.archived ? "Restore" : "Archive"} {confirming?.name}?
            </SheetTitle>
            <SheetDescription>
              {confirming?.archived
                ? "New sales entries and coverage expectations can resume."
                : "New entries stop. Historical reports remain available."}
            </SheetDescription>
          </SheetHeader>
          {actionError && (
            <p role="alert" className="text-danger mb-4 text-sm">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirming(null)}>
              Keep {confirming?.archived ? "archived" : "active"}
            </Button>
            <Button onClick={changeArchived}>
              {confirming?.archived ? "Restore platform" : "Archive platform"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
