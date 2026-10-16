import type { PrismaClient } from "@/generated/prisma/client";
import { fromDbDate, toDbDate } from "@/lib/dates";
import { getPrisma } from "@/lib/prisma";
import { type PlatformInput, platformInputSchema } from "@/lib/validation/workspace";
import { type Result, fail, isUniqueViolation, ok } from "./result";

/** Platform management. Callers must already have checked MANAGE_PLATFORMS. */

type PlatformContext = { workspaceId: string; actorId: string };
type PlatformError = "INVALID" | "NOT_FOUND" | "NAME_TAKEN" | "START_AFTER_SALES";

function parse(input: PlatformInput) {
  const parsed = platformInputSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data } as const;
  return {
    error: fail("INVALID", "Check the highlighted fields.", {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      ),
    }),
  } as const;
}

const nameTaken = () => fail("NAME_TAKEN", "Another platform already uses this name.");

export async function listPlatforms(workspaceId: string, db: PrismaClient = getPrisma()) {
  return db.platform.findMany({
    where: { workspaceId },
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
}

export async function createPlatform(
  ctx: PlatformContext,
  input: PlatformInput,
  db: PrismaClient = getPrisma(),
): Promise<Result<{ id: string }, PlatformError>> {
  const parsed = parse(input);
  if (parsed.error) return parsed.error;
  const { name, provider, trackingStartDate } = parsed.data;
  try {
    const platform = await db.platform.create({
      data: {
        workspaceId: ctx.workspaceId,
        name,
        provider,
        trackingStartDate: toDbDate(trackingStartDate),
      },
    });
    return ok({ id: platform.id });
  } catch (error) {
    if (isUniqueViolation(error)) return nameTaken();
    throw error;
  }
}

/**
 * Updates name, provider and tracking start. The start date cannot move past the
 * platform's earliest recorded day, which would hide existing entries from coverage.
 */
export async function updatePlatform(
  ctx: PlatformContext,
  platformId: string,
  input: PlatformInput,
  db: PrismaClient = getPrisma(),
): Promise<Result<{ id: string }, PlatformError>> {
  const parsed = parse(input);
  if (parsed.error) return parsed.error;
  const { name, provider, trackingStartDate } = parsed.data;

  try {
    return await db.$transaction(async (tx) => {
      const platform = await tx.platform.findFirst({
        where: { id: platformId, workspaceId: ctx.workspaceId },
      });
      if (!platform) return fail("NOT_FOUND", "Platform not found.");

      const earliest = await tx.dailySales.findFirst({
        where: { workspaceId: ctx.workspaceId, platformId },
        orderBy: { businessDate: "asc" },
        select: { businessDate: true },
      });
      if (earliest && trackingStartDate > fromDbDate(earliest.businessDate)) {
        return fail(
          "START_AFTER_SALES",
          `Sales exist from ${fromDbDate(earliest.businessDate)}. The tracking start cannot be later.`,
        );
      }

      await tx.platform.update({
        where: { id: platform.id },
        data: { name, provider, trackingStartDate: toDbDate(trackingStartDate) },
      });
      return ok({ id: platform.id });
    });
  } catch (error) {
    if (isUniqueViolation(error)) return nameTaken();
    throw error;
  }
}

/** Archiving stops new entries and coverage expectations; history stays reportable. */
export async function setPlatformArchived(
  ctx: PlatformContext,
  platformId: string,
  archived: boolean,
  db: PrismaClient = getPrisma(),
): Promise<Result<{ id: string }, PlatformError>> {
  const { count } = await db.platform.updateMany({
    where: { id: platformId, workspaceId: ctx.workspaceId },
    data: archived
      ? { archivedAt: new Date(), archivedById: ctx.actorId }
      : { archivedAt: null, archivedById: null },
  });
  return count === 0 ? fail("NOT_FOUND", "Platform not found.") : ok({ id: platformId });
}
