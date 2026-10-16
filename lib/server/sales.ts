import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { type BusinessDate, fromDbDate, toDbDate, todayInTimeZone } from "@/lib/dates";
import { getPrisma } from "@/lib/prisma";
import {
  type DailySalesCorrection,
  type DailySalesInput,
  dailySalesCorrectionSchema,
  dailySalesInputSchema,
} from "@/lib/validation/sales";
import { type Result, fail, isUniqueViolation, ok } from "./result";

/**
 * Sales writes. Every create, correction and deletion writes its SalesAudit row
 * in the same transaction. Callers must already have checked the actor's
 * membership and permissions; that wrapper is added with authentication.
 */

export type SalesContext = {
  workspaceId: string;
  actorId: string;
  /** Injectable for tests; defaults to the current time. */
  now?: Date;
};

export type DailySalesRecord = {
  id: string;
  platformId: string;
  businessDate: BusinessDate;
  orders: number;
  amount: string;
  updatedAt: Date;
};

type SalesError =
  | "INVALID"
  | "PLATFORM_NOT_FOUND"
  | "PLATFORM_ARCHIVED"
  | "BEFORE_TRACKING_START"
  | "FUTURE_DATE"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "STALE"
  | "NO_CHANGE";

type Tx = Prisma.TransactionClient;

function toRecord(row: {
  id: string;
  platformId: string;
  businessDate: Date;
  orders: number;
  amount: Prisma.Decimal;
  updatedAt: Date;
}): DailySalesRecord {
  return {
    id: row.id,
    platformId: row.platformId,
    businessDate: fromDbDate(row.businessDate),
    orders: row.orders,
    amount: row.amount.toFixed(2),
    updatedAt: row.updatedAt,
  };
}

function invalid(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
  return fail("INVALID", "Check the highlighted fields.", { fieldErrors });
}

async function checkEntryAllowed(
  tx: Tx,
  ctx: SalesContext,
  platformId: string,
  businessDate: BusinessDate,
): Promise<Result<null, SalesError>> {
  const [workspace, platform] = await Promise.all([
    tx.workspace.findUniqueOrThrow({ where: { id: ctx.workspaceId }, select: { timeZone: true } }),
    tx.platform.findFirst({
      where: { id: platformId, workspaceId: ctx.workspaceId },
      select: { archivedAt: true, trackingStartDate: true },
    }),
  ]);
  if (!platform) return fail("PLATFORM_NOT_FOUND", "Choose a platform.");
  if (platform.archivedAt) {
    return fail("PLATFORM_ARCHIVED", "This platform is archived. New entries are stopped.");
  }
  if (businessDate < fromDbDate(platform.trackingStartDate)) {
    return fail("BEFORE_TRACKING_START", "This date is before the platform's tracking start date.");
  }
  if (businessDate > todayInTimeZone(workspace.timeZone, ctx.now)) {
    return fail("FUTURE_DATE", "Sales cannot be recorded for a future date.");
  }
  return ok(null);
}

async function findExisting(tx: Tx, ctx: SalesContext, platformId: string, date: BusinessDate) {
  return tx.dailySales.findUnique({
    where: {
      workspaceId_platformId_businessDate: {
        workspaceId: ctx.workspaceId,
        platformId,
        businessDate: toDbDate(date),
      },
    },
    select: { id: true },
  });
}

/**
 * Creates the day's total. If the platform already has a record for that date,
 * returns DUPLICATE with `existingId` so the UI can open it for correction.
 */
export async function createDailySales(
  ctx: SalesContext,
  input: DailySalesInput,
  db: PrismaClient = getPrisma(),
): Promise<Result<DailySalesRecord, SalesError>> {
  const parsed = dailySalesInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { platformId, businessDate, orders, amount } = parsed.data;

  const duplicate = (existingId?: string) =>
    fail("DUPLICATE", "An entry already exists for this platform and date.", { existingId });

  try {
    return await db.$transaction(async (tx) => {
      const allowed = await checkEntryAllowed(tx, ctx, platformId, businessDate);
      if (!allowed.ok) return allowed;

      const existing = await findExisting(tx, ctx, platformId, businessDate);
      if (existing) return duplicate(existing.id);

      const row = await tx.dailySales.create({
        data: {
          workspaceId: ctx.workspaceId,
          platformId,
          businessDate: toDbDate(businessDate),
          orders,
          amount: new Prisma.Decimal(amount),
          origin: "MANUAL",
          createdById: ctx.actorId,
          updatedById: ctx.actorId,
        },
      });
      await tx.salesAudit.create({
        data: {
          workspaceId: ctx.workspaceId,
          platformId,
          businessDate: row.businessDate,
          salesRecordId: row.id,
          action: "CREATED",
          actorId: ctx.actorId,
          afterOrders: row.orders,
          afterAmount: row.amount,
        },
      });
      return ok(toRecord(row));
    });
  } catch (error) {
    // Another request created the same day between our check and insert.
    if (!isUniqueViolation(error)) throw error;
    const existing = await findExisting(db, ctx, platformId, businessDate);
    return duplicate(existing?.id);
  }
}

/**
 * Replaces a record's figures. Pass `expectedUpdatedAt` from the record the user
 * edited to reject the save if someone else changed it in the meantime.
 */
export async function correctDailySales(
  ctx: SalesContext,
  recordId: string,
  input: DailySalesCorrection,
  options: { expectedUpdatedAt?: Date } = {},
  db: PrismaClient = getPrisma(),
): Promise<Result<DailySalesRecord, SalesError>> {
  const parsed = dailySalesCorrectionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { orders, amount, reason } = parsed.data;
  const newAmount = new Prisma.Decimal(amount);

  return db.$transaction(async (tx) => {
    const current = await tx.dailySales.findFirst({
      where: { id: recordId, workspaceId: ctx.workspaceId },
    });
    if (!current) return fail("NOT_FOUND", "This record no longer exists.");
    if (
      options.expectedUpdatedAt &&
      current.updatedAt.getTime() !== options.expectedUpdatedAt.getTime()
    ) {
      return fail("STALE", "Someone else changed this record. Reload it and try again.");
    }
    if (current.orders === orders && current.amount.equals(newAmount)) {
      return fail("NO_CHANGE", "The corrected values match the current record.");
    }

    // The conditional update guards against a concurrent correction.
    const { count } = await tx.dailySales.updateMany({
      where: { id: current.id, updatedAt: current.updatedAt },
      data: { orders, amount: newAmount, updatedById: ctx.actorId },
    });
    if (count === 0) {
      return fail("STALE", "Someone else changed this record. Reload it and try again.");
    }
    const row = await tx.dailySales.findUniqueOrThrow({ where: { id: current.id } });

    await tx.salesAudit.create({
      data: {
        workspaceId: ctx.workspaceId,
        platformId: current.platformId,
        businessDate: current.businessDate,
        salesRecordId: current.id,
        action: "CORRECTED",
        actorId: ctx.actorId,
        beforeOrders: current.orders,
        beforeAmount: current.amount,
        afterOrders: row.orders,
        afterAmount: row.amount,
        reason: reason || null,
      },
    });
    return ok(toRecord(row));
  });
}

/**
 * Deletes a record. The day becomes missing again; the audit history keeps the values.
 * Pass `expectedUpdatedAt` from the record the user saw to reject the delete if
 * someone else changed it in the meantime.
 */
export async function deleteDailySales(
  ctx: SalesContext,
  recordId: string,
  options: { reason?: string; expectedUpdatedAt?: Date } = {},
  db: PrismaClient = getPrisma(),
): Promise<Result<{ id: string }, SalesError>> {
  return db.$transaction(async (tx) => {
    const current = await tx.dailySales.findFirst({
      where: { id: recordId, workspaceId: ctx.workspaceId },
    });
    if (!current) return fail("NOT_FOUND", "This record no longer exists.");
    if (
      options.expectedUpdatedAt &&
      current.updatedAt.getTime() !== options.expectedUpdatedAt.getTime()
    ) {
      return fail("STALE", "Someone else changed this record. Reload it and try again.");
    }

    // The conditional delete guards against a concurrent correction.
    const { count } = await tx.dailySales.deleteMany({
      where: { id: current.id, updatedAt: current.updatedAt },
    });
    if (count === 0) {
      return fail("STALE", "Someone else changed this record. Reload it and try again.");
    }
    await tx.salesAudit.create({
      data: {
        workspaceId: ctx.workspaceId,
        platformId: current.platformId,
        businessDate: current.businessDate,
        salesRecordId: current.id,
        action: "DELETED",
        actorId: ctx.actorId,
        beforeOrders: current.orders,
        beforeAmount: current.amount,
        reason: options.reason?.trim() || null,
      },
    });
    return ok({ id: current.id });
  });
}

/** History for one platform-day, newest first, across deletes and re-creates. */
export async function getSalesHistory(
  workspaceId: string,
  platformId: string,
  businessDate: BusinessDate,
  db: PrismaClient = getPrisma(),
) {
  return db.salesAudit.findMany({
    where: { workspaceId, platformId, businessDate: toDbDate(businessDate) },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { displayName: true, removedAt: true } } },
  });
}

/**
 * Recorded days in an inclusive business-date range, newest first. Days without a
 * row are unknown, not zero; callers decide which of them count as missing.
 */
export async function listDailySales(
  workspaceId: string,
  range: { from: BusinessDate; to: BusinessDate; platformId?: string },
  db: PrismaClient = getPrisma(),
): Promise<DailySalesRecord[]> {
  const rows = await db.dailySales.findMany({
    where: {
      workspaceId,
      businessDate: { gte: toDbDate(range.from), lte: toDbDate(range.to) },
      ...(range.platformId ? { platformId: range.platformId } : {}),
    },
    orderBy: [{ businessDate: "desc" }, { platformId: "asc" }],
    select: {
      id: true,
      platformId: true,
      businessDate: true,
      orders: true,
      amount: true,
      updatedAt: true,
    },
  });
  return rows.map(toRecord);
}
