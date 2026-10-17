"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Radix Select reserves "" for "no value", so "All platforms" uses its own key. */
const ALL = "all";

/** Platform filter for the list, calendar and totals. Kept in the URL. */
export function PlatformFilter({
  platforms,
  value,
}: {
  platforms: { id: string; name: string; archived: boolean }[];
  value: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onChange(platform: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (platform && platform !== ALL) query.set("platform", platform);
    else query.delete("platform");
    startTransition(() => router.push(`/sales?${query.toString()}`));
  }

  return (
    <Select value={value || ALL} onValueChange={onChange} disabled={pending}>
      <SelectTrigger
        aria-label="Platform"
        className="h-11 w-full gap-2 pr-3 pl-4 text-sm sm:w-auto sm:min-w-56"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Filter aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
          <span className="text-muted-foreground shrink-0">Platform</span>
          <span className="text-foreground truncate font-medium">
            <SelectValue />
          </span>
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>All platforms</SelectItem>
        {platforms.map((platform) => (
          <SelectItem key={platform.id} value={platform.id}>
            {platform.name}
            {platform.archived ? " (archived)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
