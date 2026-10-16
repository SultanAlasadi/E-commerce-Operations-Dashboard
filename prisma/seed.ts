/**
 * Development seed that mirrors the reference designs, including the edge cases
 * the reports must handle: a platform that starts mid-window, a missing day, a
 * recorded zero, an archived platform, a correction and a deletion.
 *
 * Idempotent: the seed workspace has a fixed id and is rebuilt on every run.
 * Refuses to run against the production branch.
 */
import { loadEnvConfig } from "@next/env";
import { Prisma } from "@/generated/prisma/client";
import { addDays, toDbDate, todayInTimeZone } from "@/lib/dates";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { correctDailySales, deleteDailySales } from "@/lib/server/sales";

// Nothing reads the environment at import time; getPrisma() reads DATABASE_URL lazily.
loadEnvConfig(process.cwd());

const SEED_WORKSPACE_ID = "0199f000-0000-7000-8000-000000000001";
const TIME_ZONE = "America/New_York";

async function main() {
  if (process.env.NEON_BRANCH !== "development") {
    throw new Error(
      `Refusing to seed: NEON_BRANCH is "${process.env.NEON_BRANCH}", not "development".`,
    );
  }

  const db = getPrisma();
  const today = todayInTimeZone(TIME_ZONE);
  const yesterday = addDays(today, -1);

  await db.$transaction(async (tx) => {
    const where = { workspaceId: SEED_WORKSPACE_ID };
    await tx.salesAudit.deleteMany({ where });
    await tx.dailySales.deleteMany({ where });
    await tx.platform.deleteMany({ where });
    await tx.invitation.deleteMany({ where });
    await tx.memberPermission.deleteMany({ where: { member: where } });
    await tx.member.updateMany({ where, data: { removedById: null } });
    await tx.member.deleteMany({ where });
    await tx.workspace.deleteMany({ where: { id: SEED_WORKSPACE_ID } });
  });

  const workspace = await db.workspace.create({
    data: {
      id: SEED_WORKSPACE_ID,
      name: "North Coast Co.",
      currency: "SAR",
      timeZone: TIME_ZONE,
      setupCompletedAt: new Date(),
    },
  });

  const member = (
    clerkUserId: string,
    displayName: string,
    email: string,
    role: "OWNER" | "MANAGER" | "USER",
    permissions = ROLE_DEFAULT_PERMISSIONS[role],
  ) =>
    db.member.create({
      data: {
        workspaceId: workspace.id,
        clerkUserId,
        displayName,
        email,
        role,
        permissions: { create: permissions.map((permission) => ({ permission })) },
      },
    });

  const maya = await member("seed_maya", "Maya Chen", "maya@northcoast.co", "OWNER");
  const eli = await member("seed_eli", "Eli Rivera", "eli@northcoast.co", "MANAGER");
  await member("seed_ava", "Ava Miller", "ava@northcoast.co", "USER", [
    "VIEW_DASHBOARD",
    "VIEW_SALES",
    "ADD_SALES",
  ]);

  await db.invitation.create({
    data: {
      workspaceId: workspace.id,
      email: "nora@northcoast.co",
      role: "MANAGER",
      permissions: [...ROLE_DEFAULT_PERMISSIONS.MANAGER],
      invitedById: maya.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const platform = (name: string, provider: string, start: string, archived = false) =>
    db.platform.create({
      data: {
        workspaceId: workspace.id,
        name,
        provider,
        trackingStartDate: toDbDate(start),
        ...(archived ? { archivedAt: new Date(), archivedById: maya.id } : {}),
      },
    });

  const shopifyUs = await platform("Shopify US", "Shopify", "2026-09-01");
  const shopifyEu = await platform("Shopify EU", "Shopify", "2026-09-15");
  const amazonUk = await platform("Amazon UK", "Amazon", "2026-09-01");
  await platform("Holiday pop-up", "Manual store", "2025-11-01", true);

  // Deterministic pseudo-random figures so every run produces the same data.
  let state = 42;
  const random = () => (state = (state * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31;

  const missingDay = addDays(today, -10); // Amazon UK has no entry
  const zeroDay = addDays(today, -4); // Shopify EU recorded zero

  const rows: Prisma.DailySalesCreateManyInput[] = [];
  const audits: Prisma.SalesAuditCreateManyInput[] = [];
  for (let offset = 30; offset >= 1; offset--) {
    const day = addDays(today, -offset);
    for (const [p, base] of [
      [shopifyUs, 40],
      [shopifyEu, 14],
      [amazonUk, 20],
    ] as const) {
      if (day < p.trackingStartDate.toISOString().slice(0, 10)) continue;
      if (p.id === amazonUk.id && day === missingDay) continue;

      const isZero = p.id === shopifyEu.id && day === zeroDay;
      const orders = isZero ? 0 : base + Math.floor(random() * 12);
      const amount = isZero ? "0.00" : (orders * (100 + random() * 30)).toFixed(2);
      const id = crypto.randomUUID();
      rows.push({
        id,
        workspaceId: workspace.id,
        platformId: p.id,
        businessDate: toDbDate(day),
        orders,
        amount: new Prisma.Decimal(amount),
        createdById: eli.id,
        updatedById: eli.id,
      });
      audits.push({
        workspaceId: workspace.id,
        platformId: p.id,
        businessDate: toDbDate(day),
        salesRecordId: id,
        action: "CREATED",
        actorId: eli.id,
        afterOrders: orders,
        afterAmount: new Prisma.Decimal(amount),
      });
    }
  }
  await db.dailySales.createMany({ data: rows });
  await db.salesAudit.createMany({ data: audits });

  // One correction and one deletion through the real services, so their audit
  // rows match what the app writes.
  const ctx = { workspaceId: workspace.id, actorId: maya.id };
  const toCorrect = await db.dailySales.findFirstOrThrow({
    where: { platformId: shopifyUs.id, businessDate: toDbDate(yesterday) },
  });
  const corrected = await correctDailySales(ctx, toCorrect.id, {
    orders: toCorrect.orders + 2,
    amount: toCorrect.amount.plus(260).toFixed(2),
    reason: "Late store close adjustment",
  });
  if (!corrected.ok) throw new Error(`Seed correction failed: ${corrected.message}`);

  const toDelete = await db.dailySales.findFirstOrThrow({
    where: { platformId: shopifyEu.id, businessDate: toDbDate(addDays(today, -2)) },
  });
  const deleted = await deleteDailySales({ ...ctx, actorId: eli.id }, toDelete.id, {
    reason: "Entered for the wrong store",
  });
  if (!deleted.ok) throw new Error(`Seed deletion failed: ${deleted.message}`);

  const counts = await Promise.all([
    db.member.count({ where: { workspaceId: workspace.id } }),
    db.platform.count({ where: { workspaceId: workspace.id } }),
    db.dailySales.count({ where: { workspaceId: workspace.id } }),
    db.salesAudit.count({ where: { workspaceId: workspace.id } }),
  ]);
  console.log(
    `Seeded "${workspace.name}": ${counts[0]} members, ${counts[1]} platforms, ` +
      `${counts[2]} daily records, ${counts[3]} audit rows (today ${today} in ${TIME_ZONE}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
