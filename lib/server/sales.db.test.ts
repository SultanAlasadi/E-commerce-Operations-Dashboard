/**
 * Integration tests against a real Neon branch. They run only when NEON_BRANCH
 * names a non-production branch, use their own throwaway workspace, and delete
 * it afterwards, so seeded development data is untouched.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { addDays, toDbDate, todayInTimeZone } from "@/lib/dates";
import { getPrisma } from "@/lib/prisma";
import { setPlatformArchived, updatePlatform } from "./platforms";
import { correctDailySales, createDailySales, deleteDailySales, getSalesHistory } from "./sales";
import { updateWorkspaceSettings } from "./workspace";

const branch = process.env.NEON_BRANCH;
const enabled = Boolean(process.env.DATABASE_URL) && Boolean(branch) && branch !== "production";

describe.skipIf(!enabled)("sales data layer (database)", () => {
  let db: PrismaClient;
  const TZ = "America/New_York";
  const today = todayInTimeZone(TZ);
  let workspaceId = "";
  let actorId = "";
  let platformId = "";
  let otherWorkspacePlatformId = "";
  const otherWorkspaceIds: string[] = [];

  const ctx = () => ({ workspaceId, actorId });

  async function cleanup(ids: string[]) {
    const where = { workspaceId: { in: ids } };
    await db.salesAudit.deleteMany({ where });
    await db.dailySales.deleteMany({ where });
    await db.platform.deleteMany({ where });
    await db.memberPermission.deleteMany({ where: { member: where } });
    await db.member.deleteMany({ where });
    await db.workspace.deleteMany({ where: { id: { in: ids } } });
  }

  beforeAll(async () => {
    db = getPrisma();
    const workspace = await db.workspace.create({
      data: { name: "Test workspace", currency: "SAR", timeZone: TZ },
    });
    workspaceId = workspace.id;
    const member = await db.member.create({
      data: {
        workspaceId,
        clerkUserId: "test_actor",
        email: "actor@test.dev",
        displayName: "Actor",
        role: "OWNER",
      },
    });
    actorId = member.id;
    const platform = await db.platform.create({
      data: { workspaceId, name: "Test store", trackingStartDate: toDbDate(addDays(today, -60)) },
    });
    platformId = platform.id;

    const other = await db.workspace.create({
      data: { name: "Other", currency: "SAR", timeZone: TZ },
    });
    otherWorkspaceIds.push(other.id);
    const otherPlatform = await db.platform.create({
      data: {
        workspaceId: other.id,
        name: "Other store",
        trackingStartDate: toDbDate("2026-01-01"),
      },
    });
    otherWorkspacePlatformId = otherPlatform.id;
  });

  afterAll(async () => {
    await cleanup([workspaceId, ...otherWorkspaceIds].filter(Boolean));
  });

  it("creates a day with one CREATED audit row, and opens the existing record on duplicates", async () => {
    const date = addDays(today, -1);
    const created = await createDailySales(ctx(), {
      platformId,
      businessDate: date,
      orders: 42,
      amount: "4860.00",
    });
    expect(created.ok).toBe(true);

    const duplicate = await createDailySales(ctx(), {
      platformId,
      businessDate: date,
      orders: 1,
      amount: "1.00",
    });
    expect(duplicate).toMatchObject({ ok: false, error: "DUPLICATE" });
    if (!duplicate.ok && created.ok) expect(duplicate.details?.existingId).toBe(created.value.id);

    const history = await getSalesHistory(workspaceId, platformId, date);
    expect(history.map((h) => h.action)).toEqual(["CREATED"]);
  });

  it("records corrections and deletions, and keeps history across delete + re-create", async () => {
    const date = addDays(today, -2);
    const created = await createDailySales(ctx(), {
      platformId,
      businessDate: date,
      orders: 42,
      amount: "4860.00",
    });
    if (!created.ok) throw new Error(created.message);

    const corrected = await correctDailySales(ctx(), created.value.id, {
      orders: 44,
      amount: "5120.00",
      reason: "Late close",
    });
    expect(corrected).toMatchObject({ ok: true, value: { orders: 44, amount: "5120.00" } });

    expect(
      await correctDailySales(ctx(), created.value.id, { orders: 44, amount: "5120" }),
    ).toMatchObject({
      ok: false,
      error: "NO_CHANGE",
    });
    expect(
      await correctDailySales(
        ctx(),
        created.value.id,
        { orders: 45, amount: "5200" },
        { expectedUpdatedAt: created.value.updatedAt },
      ),
    ).toMatchObject({ ok: false, error: "STALE" });

    expect((await deleteDailySales(ctx(), created.value.id)).ok).toBe(true);
    expect(
      (await createDailySales(ctx(), { platformId, businessDate: date, orders: 0, amount: "0" }))
        .ok,
    ).toBe(true);

    const history = await getSalesHistory(workspaceId, platformId, date);
    expect(history.map((h) => h.action).sort()).toEqual([
      "CORRECTED",
      "CREATED",
      "CREATED",
      "DELETED",
    ]);
    const correction = history.find((h) => h.action === "CORRECTED");
    expect(correction?.beforeAmount?.toFixed(2)).toBe("4860.00");
    expect(correction?.afterAmount?.toFixed(2)).toBe("5120.00");
    expect(correction?.reason).toBe("Late close");
  });

  it("rejects future dates, dates before tracking start, and archived platforms", async () => {
    const input = (businessDate: string) => ({
      platformId,
      businessDate,
      orders: 1,
      amount: "10.00",
    });
    expect(await createDailySales(ctx(), input(addDays(today, 1)))).toMatchObject({
      error: "FUTURE_DATE",
    });
    expect(await createDailySales(ctx(), input(addDays(today, -61)))).toMatchObject({
      error: "BEFORE_TRACKING_START",
    });

    await setPlatformArchived(ctx(), platformId, true);
    expect(await createDailySales(ctx(), input(addDays(today, -3)))).toMatchObject({
      error: "PLATFORM_ARCHIVED",
    });
    await setPlatformArchived(ctx(), platformId, false);
  });

  it("never lets a record point at another workspace's platform", async () => {
    expect(
      await createDailySales(ctx(), {
        platformId: otherWorkspacePlatformId,
        businessDate: addDays(today, -1),
        orders: 1,
        amount: "1",
      }),
    ).toMatchObject({ error: "PLATFORM_NOT_FOUND" });

    // Bypassing the service, the composite foreign key still rejects it.
    await expect(
      db.dailySales.create({
        data: {
          workspaceId,
          platformId: otherWorkspacePlatformId,
          businessDate: toDbDate(addDays(today, -1)),
          orders: 1,
          amount: new Prisma.Decimal("1"),
          createdById: actorId,
          updatedById: actorId,
        },
      }),
    ).rejects.toThrow();
  });

  it("enforces the figure rules in the database itself", async () => {
    const raw = (orders: number, amount: string, offset: number) =>
      db.dailySales.create({
        data: {
          workspaceId,
          platformId,
          businessDate: toDbDate(addDays(today, -offset)),
          orders,
          amount: new Prisma.Decimal(amount),
          createdById: actorId,
          updatedById: actorId,
        },
      });
    await expect(raw(-1, "0", 20)).rejects.toThrow();
    await expect(raw(1, "-5", 21)).rejects.toThrow();
    await expect(raw(0, "10", 22)).rejects.toThrow();
  });

  it("allows only one active owner per workspace", async () => {
    await expect(
      db.member.create({
        data: {
          workspaceId,
          clerkUserId: "test_second_owner",
          email: "second@test.dev",
          displayName: "Second",
          role: "OWNER",
        },
      }),
    ).rejects.toThrow();
  });

  it("blocks moving tracking start after existing sales and locks currency once sales exist", async () => {
    expect(
      await updatePlatform(ctx(), platformId, { name: "Test store", trackingStartDate: today }),
    ).toMatchObject({ ok: false, error: "START_AFTER_SALES" });

    expect(
      await updateWorkspaceSettings(workspaceId, {
        name: "Test workspace",
        currency: "USD",
        timeZone: TZ,
      }),
    ).toMatchObject({ ok: false, error: "CURRENCY_LOCKED" });
    expect(
      await updateWorkspaceSettings(workspaceId, {
        name: "Renamed",
        currency: "sar",
        timeZone: TZ,
      }),
    ).toMatchObject({ ok: true });
  });
});
