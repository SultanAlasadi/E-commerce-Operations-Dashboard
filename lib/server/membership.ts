import type { Member, Permission, PrismaClient, Workspace } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type MemberContext = {
  member: Member; // active member (removedAt is null)
  workspace: Workspace;
  permissions: ReadonlySet<Permission>;
};

/**
 * The Clerk user's active membership with its workspace and effective permissions
 * (the MemberPermission rows), or null when there is none. Removed members never match.
 * Callers in request code go through lib/auth/membership.ts.
 */
export async function getActiveMembership(
  clerkUserId: string,
  db: PrismaClient = getPrisma(),
): Promise<MemberContext | null> {
  const row = await db.member.findFirst({
    where: { clerkUserId, removedAt: null },
    include: { workspace: true, permissions: { select: { permission: true } } },
    // TODO(phase-8): the brand switcher chooses the workspace. Until then a user who is
    // active in several workspaces gets the oldest membership.
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (!row) return null;

  const { workspace, permissions, ...member } = row;
  return {
    member,
    workspace,
    permissions: new Set(permissions.map((p) => p.permission)),
  };
}
