/**
 * Integration tests against a real Neon branch. They run only when NEON_BRANCH
 * names a non-production branch, use their own throwaway workspaces, and delete
 * them afterwards, so seeded development data is untouched.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Permission, PrismaClient, Role } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getActiveMembership } from "./membership";

const branch = process.env.NEON_BRANCH;
const enabled = Boolean(process.env.DATABASE_URL) && Boolean(branch) && branch !== "production";

describe.skipIf(!enabled)("getActiveMembership (database)", () => {
  let db: PrismaClient;
  const run = randomUUID().slice(0, 8);
  const workspaceIds: string[] = [];

  async function createWorkspace(name: string) {
    const workspace = await db.workspace.create({
      data: { name: `${name} ${run}`, currency: "SAR", timeZone: "Asia/Riyadh" },
    });
    workspaceIds.push(workspace.id);
    return workspace;
  }

  async function createMember(
    workspaceId: string,
    clerkUserId: string,
    role: Role,
    permissions: readonly Permission[],
    extra: { createdAt?: Date; removedAt?: Date } = {},
  ) {
    return db.member.create({
      data: {
        workspaceId,
        clerkUserId,
        email: `${clerkUserId}@test.dev`,
        displayName: clerkUserId,
        role,
        ...extra,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });
  }

  beforeAll(async () => {
    db = getPrisma();
  });

  afterAll(async () => {
    const where = { workspaceId: { in: workspaceIds } };
    await db.memberPermission.deleteMany({ where: { member: where } });
    await db.member.deleteMany({ where });
    await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  });

  it("finds an active member with its workspace and permissions", async () => {
    const workspace = await createWorkspace("Active");
    const clerkUserId = `test_active_${run}`;
    const member = await createMember(workspace.id, clerkUserId, "USER", [
      "VIEW_DASHBOARD",
      "VIEW_SALES",
    ]);

    const ctx = await getActiveMembership(clerkUserId, db);
    expect(ctx?.member.id).toBe(member.id);
    expect(ctx?.workspace.id).toBe(workspace.id);
    expect([...(ctx?.permissions ?? [])].sort()).toEqual(["VIEW_DASHBOARD", "VIEW_SALES"]);
    expect(ctx?.member).not.toHaveProperty("permissions");
  });

  it("returns nothing for a removed member", async () => {
    const workspace = await createWorkspace("Removed");
    const clerkUserId = `test_removed_${run}`;
    await createMember(workspace.id, clerkUserId, "MANAGER", ["VIEW_DASHBOARD"], {
      removedAt: new Date(),
    });

    expect(await getActiveMembership(clerkUserId, db)).toBeNull();
  });

  it("returns nothing for an unknown Clerk id", async () => {
    expect(await getActiveMembership(`test_unknown_${run}`, db)).toBeNull();
  });

  it("uses the oldest active membership when a user is in two workspaces", async () => {
    const clerkUserId = `test_two_${run}`;
    const newer = await createWorkspace("Newer");
    const older = await createWorkspace("Older");
    // Inserted first but joined later, so the order comes from createdAt, not insertion.
    await createMember(newer.id, clerkUserId, "USER", ["VIEW_DASHBOARD"], {
      createdAt: new Date("2026-02-01T00:00:00Z"),
    });
    const oldest = await createMember(older.id, clerkUserId, "MANAGER", ["MANAGE_TEAM"], {
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    const ctx = await getActiveMembership(clerkUserId, db);
    expect(ctx?.member.id).toBe(oldest.id);
    expect(ctx?.workspace.id).toBe(older.id);
    expect([...(ctx?.permissions ?? [])]).toEqual(["MANAGE_TEAM"]);
  });
});
