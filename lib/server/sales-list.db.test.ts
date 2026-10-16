/**
 * Integration tests for listDailySales and the stale-delete check, against a real
 * Neon branch. They run only when NEON_BRANCH names a non-production branch, use
 * their own throwaway workspaces, and delete them afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { addDays, toDbDate, todayInTimeZone } from "@/lib/dates";
import { getPrisma } from "@/lib/prisma";
import {
  correctDailySales,
  createDailySales,
  deleteDailySales,
  getSalesHistory,
  listDailySales,
} from "./sales";

const branch = process.env.NEON_BRANCH;
const enabled = Boolean(process.env.DATABASE_URL) && Boolean(branch) && branch !== "production";

describe.skipIf(!enabled)("listDailySales and stale deletes (database)", () => {
  let db: PrismaClient;
  const TZ = "Asia/Riyadh";
  const today = todayInTimeZone(TZ);
  const workspaceIds: string[] = [];
  let workspaceId = "";
  let actorId = "";
  let storeA = "";
  let storeB = "";

  const ctx = () => ({ workspaceId, actorId });

  async function seedWorkspace(name: string) {
    const workspace = await db.workspace.create({
      data: { name, currency: "SAR", timeZone: TZ },
    });
    workspaceIds.push(workspace.id);
    const member = await db.member.create({
      data: {
        workspaceId: workspace.id,
        clerkUserId: `test_list_${workspace.id}`,
        email: `list-${workspace.id}@test.dev`,
        displayName: "Lister",
        role: "OWNER",
      },
    });
    const platform = (platformName: string) =>
      db.platform.create({
        data: {
          workspaceId: workspace.id,
          name: platformName,
          trackingStartDate: toDbDate(addDays(today, -30)),
        },
      });
    const [a, b] = await Promise.all([platform("Store A"), platform("Store B")]);
    return { workspaceId: workspace.id, actorId: member.id, storeA: a.id, storeB: b.id };
  }

  beforeAll(async () => {
    db = getPrisma();
    ({ workspaceId, actorId, storeA, storeB } = await seedWorkspace("List test workspace"));

    const add = (platformId: string, offset: number, orders: number, amount: string) =>
      createDailySales(ctx(), {
        platformId,
        businessDate: addDays(today, -offset),
        orders,
        amount,
      });
    for (const result of await Promise.all([
      add(storeA, 1, 42, "4860.00"),
      add(storeA, 2, 0, "0"),
      add(storeA, 5, 10, "1240.50"),
      add(storeB, 1, 3, "99.99"),
      add(storeB, 10, 7, "700"),
    ])) {
      if (!result.ok) throw new Error(result.message);
    }

    // Another workspace's sales on the same days must never appear.
    const other = await seedWorkspace("Other list workspace");
    const leaked = await createDailySales(
      { workspaceId: other.workspaceId, actorId: other.actorId },
      { platformId: other.storeA, businessDate: addDays(today, -1), orders: 1, amount: "1" },
    );
    if (!leaked.ok) throw new Error(leaked.message);
  });

  afterAll(async () => {
    const where = { workspaceId: { in: workspaceIds } };
    await db.salesAudit.deleteMany({ where });
    await db.dailySales.deleteMany({ where });
    await db.platform.deleteMany({ where });
    await db.memberPermission.deleteMany({ where: { member: where } });
    await db.member.deleteMany({ where });
    await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  });

  it("returns the inclusive range, newest first, scoped to the workspace", async () => {
    const records = await listDailySales(workspaceId, {
      from: addDays(today, -5),
      to: addDays(today, -1),
    });
    expect(records.map((r) => [r.platformId === storeA ? "A" : "B", r.businessDate])).toEqual(
      expect.arrayContaining([
        ["A", addDays(today, -1)],
        ["B", addDays(today, -1)],
        ["A", addDays(today, -2)],
        ["A", addDays(today, -5)],
      ]),
    );
    expect(records).toHaveLength(4);
    const dates = records.map((r) => r.businessDate);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("keeps amounts as exact decimal strings and recorded zeros as rows", async () => {
    const records = await listDailySales(workspaceId, {
      from: addDays(today, -5),
      to: addDays(today, -2),
      platformId: storeA,
    });
    expect(records.map((r) => [r.businessDate, r.orders, r.amount])).toEqual([
      [addDays(today, -2), 0, "0.00"],
      [addDays(today, -5), 10, "1240.50"],
    ]);
  });

  it("filters by platform and leaves missing days out (they are unknown, not zero)", async () => {
    const records = await listDailySales(workspaceId, {
      from: addDays(today, -10),
      to: today,
      platformId: storeB,
    });
    expect(records.map((r) => r.businessDate)).toEqual([addDays(today, -1), addDays(today, -10)]);
    expect(await listDailySales(workspaceId, { from: today, to: today })).toEqual([]);
  });

  it("rejects a delete when the record changed after the user saw it", async () => {
    const date = addDays(today, -20);
    const created = await createDailySales(ctx(), {
      platformId: storeA,
      businessDate: date,
      orders: 5,
      amount: "50",
    });
    if (!created.ok) throw new Error(created.message);
    const corrected = await correctDailySales(ctx(), created.value.id, { orders: 6, amount: "60" });
    if (!corrected.ok) throw new Error(corrected.message);

    expect(
      await deleteDailySales(ctx(), created.value.id, {
        expectedUpdatedAt: created.value.updatedAt,
      }),
    ).toMatchObject({ ok: false, error: "STALE" });
    expect(
      await listDailySales(workspaceId, { from: date, to: date, platformId: storeA }),
    ).toHaveLength(1);

    expect(
      await deleteDailySales(ctx(), created.value.id, {
        expectedUpdatedAt: corrected.value.updatedAt,
      }),
    ).toMatchObject({ ok: true });
    const history = await getSalesHistory(workspaceId, storeA, date);
    expect(history.map((h) => h.action)).toEqual(["DELETED", "CORRECTED", "CREATED"]);
  });
});
