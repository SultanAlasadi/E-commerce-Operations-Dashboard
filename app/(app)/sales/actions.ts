"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize } from "@/lib/auth/membership";
import { correctDailySales, createDailySales, deleteDailySales } from "@/lib/server/sales";
import { fail } from "@/lib/server/result";
import {
  type DailySalesCorrection,
  type DailySalesInput,
  dailySalesCorrectionSchema,
  dailySalesInputSchema,
} from "@/lib/validation/sales";

/**
 * Sales mutations. Each one checks Clerk identity, active membership and the
 * permission (authorize), validates with the form's Zod schema, then calls the
 * service, which writes the audit row in the same transaction.
 */

function invalid(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
  return fail("INVALID", "Check the highlighted fields.", { fieldErrors });
}

/** Parses the ISO timestamp the client echoes back from the record it showed. */
function parseVersion(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const isRecordId = (value: string) => z.uuid().safeParse(value).success;

export async function addDailySales(input: DailySalesInput) {
  const access = await authorize("ADD_SALES");
  if (!access.ok) return access;
  const parsed = dailySalesInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { workspace, member } = access.value;
  const result = await createDailySales(
    { workspaceId: workspace.id, actorId: member.id },
    parsed.data,
  );
  if (result.ok) revalidatePath("/sales", "layout");
  return result;
}

export async function correctSales(
  recordId: string,
  input: DailySalesCorrection,
  expectedUpdatedAt: string,
) {
  const access = await authorize("EDIT_SALES");
  if (!access.ok) return access;
  const parsed = dailySalesCorrectionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const version = parseVersion(expectedUpdatedAt);
  if (!isRecordId(recordId) || !version) return fail("NOT_FOUND", "This record no longer exists.");

  const { workspace, member } = access.value;
  const result = await correctDailySales(
    { workspaceId: workspace.id, actorId: member.id },
    recordId,
    parsed.data,
    { expectedUpdatedAt: version },
  );
  if (result.ok) revalidatePath("/sales", "layout");
  return result;
}

export async function deleteSales(recordId: string, expectedUpdatedAt: string) {
  const access = await authorize("DELETE_SALES");
  if (!access.ok) return access;
  const version = parseVersion(expectedUpdatedAt);
  if (!isRecordId(recordId) || !version) return fail("NOT_FOUND", "This record no longer exists.");

  const { workspace, member } = access.value;
  const result = await deleteDailySales(
    { workspaceId: workspace.id, actorId: member.id },
    recordId,
    { expectedUpdatedAt: version },
  );
  if (result.ok) revalidatePath("/sales", "layout");
  return result;
}
