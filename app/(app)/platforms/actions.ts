"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/membership";
import { createPlatform, setPlatformArchived, updatePlatform } from "@/lib/server/platforms";
import { fail } from "@/lib/server/result";
import { type PlatformInput, platformInputSchema } from "@/lib/validation/workspace";

async function platformContext() {
  const access = await authorize("MANAGE_PLATFORMS");
  if (!access.ok) return access;
  return {
    ok: true as const,
    value: { workspaceId: access.value.workspace.id, actorId: access.value.member.id },
  };
}

function validate(input: PlatformInput) {
  const parsed = platformInputSchema.safeParse(input);
  if (parsed.success) return { ok: true as const, value: parsed.data };
  return fail("INVALID", "Check the highlighted fields.", {
    fieldErrors: Object.fromEntries(
      parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
    ),
  });
}

export async function addPlatform(input: PlatformInput) {
  const access = await platformContext();
  if (!access.ok) return access;
  const parsed = validate(input);
  if (!parsed.ok) return parsed;
  const result = await createPlatform(access.value, input);
  if (result.ok) revalidatePath("/platforms");
  return result;
}

export async function editPlatform(platformId: string, input: PlatformInput) {
  const access = await platformContext();
  if (!access.ok) return access;
  const parsed = validate(input);
  if (!parsed.ok) return parsed;
  if (!platformId) return fail("NOT_FOUND", "Platform not found.");
  const result = await updatePlatform(access.value, platformId, input);
  if (result.ok) revalidatePath("/platforms");
  return result;
}

export async function archivePlatform(platformId: string) {
  const access = await platformContext();
  if (!access.ok) return access;
  if (!platformId) return fail("NOT_FOUND", "Platform not found.");
  const result = await setPlatformArchived(access.value, platformId, true);
  if (result.ok) revalidatePath("/platforms");
  return result;
}

export async function restorePlatform(platformId: string) {
  const access = await platformContext();
  if (!access.ok) return access;
  if (!platformId) return fail("NOT_FOUND", "Platform not found.");
  const result = await setPlatformArchived(access.value, platformId, false);
  if (result.ok) revalidatePath("/platforms");
  return result;
}
