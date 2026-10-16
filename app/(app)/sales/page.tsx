import { redirect } from "next/navigation";
import { SectionPage } from "@/components/states/section-page";
import { can, requireMember, requirePermission } from "@/lib/auth/membership";

export default async function SalesPage() {
  const ctx = await requireMember();
  if (!can(ctx, "VIEW_SALES") && !can(ctx, "ADD_SALES")) redirect("/no-access");
  await requirePermission(can(ctx, "VIEW_SALES") ? "VIEW_SALES" : "ADD_SALES");
  return (
    <SectionPage
      heading="Sales"
      title="No sales yet"
      description="Record a day to start your sales history."
    />
  );
}
