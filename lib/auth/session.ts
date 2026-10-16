import { auth } from "@clerk/nextjs/server";

/**
 * Returns the signed-in Clerk user id, or redirects to sign-in.
 *
 * This is only the identity step. Workspace membership and permission checks are
 * added on top of it (PLAN §3) and must run in every protected page, layout,
 * Server Action and Route Handler; a Clerk session alone never grants access.
 */
export async function requireClerkUserId(): Promise<string> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return userId;
}
