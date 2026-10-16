"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/membership";
import { fail } from "@/lib/server/result";
import { updateWorkspaceSettings } from "@/lib/server/workspace";
import { type WorkspaceSettingsInput, workspaceSettingsSchema } from "@/lib/validation/workspace";

export async function saveWorkspaceSettings(input: WorkspaceSettingsInput) {
  const access = await authorize("MANAGE_PLATFORMS");
  if (!access.ok) return access;
  if (access.value.member.role !== "OWNER") {
    return fail("FORBIDDEN", "Only the workspace owner can change settings.");
  }

  const parsed = workspaceSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail("INVALID", "Check the highlighted fields.", {
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
      ),
    });
  }

  const result = await updateWorkspaceSettings(access.value.workspace.id, parsed.data);
  if (result.ok) {
    revalidatePath("/settings");
    revalidatePath("/", "layout");
  }
  return result;
}
