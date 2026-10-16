import type { PrismaClient } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { type WorkspaceSettingsInput, workspaceSettingsSchema } from "@/lib/validation/workspace";
import { type Result, fail, ok } from "./result";

type WorkspaceError = "INVALID" | "NOT_FOUND" | "CURRENCY_LOCKED";

export async function getWorkspace(workspaceId: string, db: PrismaClient = getPrisma()) {
  return db.workspace.findUnique({ where: { id: workspaceId } });
}

/**
 * Saves name, currency and time zone, and marks setup complete. The currency is
 * locked once any sales exist: changing it requires an explicit data migration.
 */
export async function updateWorkspaceSettings(
  workspaceId: string,
  input: WorkspaceSettingsInput,
  db: PrismaClient = getPrisma(),
): Promise<Result<{ id: string }, WorkspaceError>> {
  const parsed = workspaceSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID", "Check the highlighted fields.", {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    });
  }
  const settings = parsed.data;

  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return fail("NOT_FOUND", "Workspace not found.");

    if (settings.currency !== workspace.currency) {
      const hasSales = await tx.dailySales.findFirst({
        where: { workspaceId },
        select: { id: true },
      });
      if (hasSales) {
        return fail(
          "CURRENCY_LOCKED",
          `Sales already exist in ${workspace.currency}. Changing currency requires a data migration.`,
        );
      }
    }

    await tx.workspace.update({
      where: { id: workspaceId },
      data: { ...settings, setupCompletedAt: workspace.setupCompletedAt ?? new Date() },
    });
    return ok({ id: workspaceId });
  });
}
