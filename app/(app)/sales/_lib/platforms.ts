import type { Workspace } from "@/generated/prisma/client";
import { type BusinessDate, fromDbDate, todayInTimeZone } from "@/lib/dates";
import { listPlatforms } from "@/lib/server/platforms";

export type SalesPlatform = {
  id: string;
  name: string;
  trackingStartDate: BusinessDate;
  /** Business date (workspace zone) the platform was archived on; null while active. */
  archivedOn: BusinessDate | null;
};

/** The workspace's platforms, active first, with dates as business dates. */
export async function loadSalesPlatforms(workspace: Workspace): Promise<SalesPlatform[]> {
  const platforms = await listPlatforms(workspace.id);
  return platforms.map((platform) => ({
    id: platform.id,
    name: platform.name,
    trackingStartDate: fromDbDate(platform.trackingStartDate),
    archivedOn: platform.archivedAt
      ? todayInTimeZone(workspace.timeZone, platform.archivedAt)
      : null,
  }));
}
