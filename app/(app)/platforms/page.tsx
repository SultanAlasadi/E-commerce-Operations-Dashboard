import { requirePermission } from "@/lib/auth/membership";
import { fromDbDate, todayInTimeZone } from "@/lib/dates";
import { listPlatforms } from "@/lib/server/platforms";
import { PlatformsView } from "./platforms-view";

export default async function PlatformsPage() {
  const ctx = await requirePermission("MANAGE_PLATFORMS");
  const platforms = await listPlatforms(ctx.workspace.id);
  return (
    <PlatformsView
      platforms={platforms.map((platform) => ({
        id: platform.id,
        name: platform.name,
        provider: platform.provider,
        trackingStartDate: fromDbDate(platform.trackingStartDate),
        archived: Boolean(platform.archivedAt),
      }))}
      today={todayInTimeZone(ctx.workspace.timeZone)}
    />
  );
}
