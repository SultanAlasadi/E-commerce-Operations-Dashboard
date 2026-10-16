import { SectionPage } from "@/components/states/section-page";
import { requirePermission } from "@/lib/auth/membership";

export default async function PlatformsPage() {
  await requirePermission("MANAGE_PLATFORMS");
  return (
    <SectionPage
      heading="Platforms"
      title="No platforms"
      description="Add your first store or account to begin tracking daily sales."
    />
  );
}
