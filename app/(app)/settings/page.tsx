import { redirect } from "next/navigation";
import { SectionPage } from "@/components/states/section-page";
import { requireMember } from "@/lib/auth/membership";

export default async function SettingsPage() {
  const ctx = await requireMember();
  if (ctx.member.role !== "OWNER") redirect("/no-access");
  return (
    <SectionPage
      heading="Settings"
      title="Workspace settings"
      description="Your workspace settings will appear here."
    />
  );
}
