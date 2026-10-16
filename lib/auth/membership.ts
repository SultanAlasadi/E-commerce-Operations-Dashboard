import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Permission } from "@/generated/prisma/client";
import { type MemberContext, getActiveMembership } from "@/lib/server/membership";
import { type Result, fail, ok } from "@/lib/server/result";
import { requireClerkUserId } from "./session";

export type { MemberContext };

/**
 * One database lookup per Clerk user per request, shared by layouts, pages and actions.
 * Membership is always read from Neon, never from Clerk session claims, so a removed
 * member is locked out on their next request even with a valid Clerk session.
 */
const membershipFor = cache((clerkUserId: string) => getActiveMembership(clerkUserId));

/**
 * The signed-in user's membership without redirecting. Used by authorize() and by
 * pages that must render for non-members, such as /no-access.
 */
export async function getCurrentMember(): Promise<
  Result<MemberContext, "UNAUTHENTICATED" | "NO_ACCESS">
> {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHENTICATED", "Sign in to continue.");
  const ctx = await membershipFor(userId);
  if (!ctx) return fail("NO_ACCESS", "This account has no access to this workspace.");
  return ok(ctx);
}

/** Signed-in user's active membership, read from Neon on every call.
 *  Not signed in → redirect to /sign-in. No active membership → redirect to /no-access. */
export const requireMember = cache(async (): Promise<MemberContext> => {
  const clerkUserId = await requireClerkUserId();
  const ctx = await membershipFor(clerkUserId);
  if (!ctx) redirect("/no-access");
  return ctx;
});

/** requireMember() plus a permission check. Missing permission → redirect to /no-access in
 *  pages/layouts. In Server Actions, use authorize() instead. */
export async function requirePermission(permission: Permission): Promise<MemberContext> {
  const ctx = await requireMember();
  if (!can(ctx, permission)) redirect("/no-access");
  return ctx;
}

/** For Server Actions: never redirects; returns a Result. */
export async function authorize(
  permission: Permission,
): Promise<Result<MemberContext, "UNAUTHENTICATED" | "NO_ACCESS" | "FORBIDDEN">> {
  const current = await getCurrentMember();
  if (!current.ok) return current;
  if (!can(current.value, permission)) {
    return fail("FORBIDDEN", "You don't have permission to do this.");
  }
  return current;
}

/** Pure check for hiding UI. Cosmetic only; the server check is authoritative. */
export function can(ctx: MemberContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}
