import { SectionPage } from "@/components/states/section-page";
import { requirePermission } from "@/lib/auth/membership";

export default async function DashboardPage() {
  await requirePermission("VIEW_DASHBOARD");
  return (
    <SectionPage
      heading="Sales overview"
      title="No sales yet"
      description="Record a day to begin the trend and coverage view."
    />
  );
}
