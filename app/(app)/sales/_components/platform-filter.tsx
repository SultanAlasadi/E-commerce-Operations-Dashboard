"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

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
    if (platform) query.set("platform", platform);
    else query.delete("platform");
    startTransition(() => router.push(`/sales?${query.toString()}`));
  }

  return (
    <label className="bg-secondary/60 border-input relative flex h-11 w-full items-center gap-2 rounded-xl border pr-3 pl-4 text-sm sm:w-auto">
      <Filter aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
      <span className="text-muted-foreground shrink-0">Platform</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={pending}
        aria-label="Platform"
        className="min-w-0 flex-1 bg-transparent py-2 font-medium [color-scheme:dark] outline-none sm:flex-none"
      >
        <option value="">All platforms</option>
        {platforms.map((platform) => (
          <option key={platform.id} value={platform.id}>
            {platform.name}
            {platform.archived ? " (archived)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
