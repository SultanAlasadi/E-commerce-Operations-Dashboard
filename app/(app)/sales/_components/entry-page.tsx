import Link from "next/link";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { type MemberContext, can } from "@/lib/auth/membership";
import { isBusinessDate, todayInTimeZone } from "@/lib/dates";
import { loadSalesPlatforms } from "../_lib/platforms";
import { SalesEntryForm } from "./sales-entry-form";

/** The add-sales screen. Callers have already checked ADD_SALES. */
export async function EntryPage({
  ctx,
  searchParams,
}: {
  ctx: MemberContext;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { workspace } = ctx;
  const today = todayInTimeZone(workspace.timeZone);
  const platforms = (await loadSalesPlatforms(workspace)).filter((p) => !p.archivedOn);

  const platformParam = typeof searchParams.platform === "string" ? searchParams.platform : "";
  const dateParam = typeof searchParams.date === "string" ? searchParams.date : "";
  const defaults = {
    platformId: platformParam,
    businessDate: isBusinessDate(dateParam) && dateParam <= today ? dateParam : undefined,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Add daily sales</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          One platform and one business date per entry
        </p>
      </div>

      {platforms.length === 0 ? (
        <EmptyState
          title="No active platforms"
          description="Sales are recorded per platform. Add a platform, or restore an archived one, before entering sales."
          action={
            can(ctx, "MANAGE_PLATFORMS") ? (
              <Button asChild>
                <Link href="/platforms">Manage platforms</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="max-w-4xl">
          <SalesEntryForm
            platforms={platforms}
            today={today}
            currency={workspace.currency}
            canViewRecords={can(ctx, "VIEW_SALES")}
            defaults={defaults}
          />
        </div>
      )}
    </div>
  );
}
