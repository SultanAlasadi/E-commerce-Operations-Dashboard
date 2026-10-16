import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/membership";
import { getWorkspace } from "@/lib/server/workspace";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const ctx = await requireMember();
  if (ctx.member.role !== "OWNER") redirect("/no-access");
  const workspace = await getWorkspace(ctx.workspace.id);
  if (!workspace) redirect("/no-access");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Workspace settings</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Reporting rules shared by this brand workspace.
        </p>
      </div>
      <SettingsForm
        initial={{
          name: workspace.name,
          currency: workspace.currency,
          timeZone: workspace.timeZone,
        }}
        setupComplete={Boolean(workspace.setupCompletedAt)}
      />
    </div>
  );
}
