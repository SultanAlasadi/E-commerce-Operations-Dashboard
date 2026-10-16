import { SectionPage } from "@/components/states/section-page";
import { requirePermission } from "@/lib/auth/membership";

export default async function TeamPage() {
  await requirePermission("MANAGE_TEAM");
  return (
    <SectionPage
      heading="Team"
      title="No invitations"
      description="Invite someone when you are ready to share access."
    />
  );
}
