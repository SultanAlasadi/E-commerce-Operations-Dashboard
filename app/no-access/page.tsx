import Link from "next/link";
import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import { getCurrentMember } from "@/lib/auth/membership";

export const metadata = { title: "No access" };

// Plain markup on purpose: Phase 2 restyles this page.
// This page must never call requireMember(), which redirects here.
export default async function NoAccessPage() {
  const current = await getCurrentMember();

  if (current.ok) {
    // An active member who opened a page they lack the permission for.
    return (
      <main className="p-4">
        <h1>You don&apos;t have access to this page</h1>
        <p>
          Your account in {current.value.workspace.name} doesn&apos;t include the permission this
          page needs. Ask the workspace owner if you need it.
        </p>
        <p>
          <Link href="/">Go to the home page</Link>
        </p>
      </main>
    );
  }

  if (current.error === "UNAUTHENTICATED") {
    return (
      <main className="p-4">
        <h1>Sign in to continue</h1>
        <p>You need to sign in before you can open this workspace.</p>
        <SignInButton />
      </main>
    );
  }

  return (
    <main className="p-4">
      <h1>No access to this workspace</h1>
      <p>
        This account isn&apos;t a member of this workspace. Ask the workspace owner to send an
        invitation to your email address, then sign in with that address.
      </p>
      <p>If you signed in with the wrong account, sign out and try another one.</p>
      <div className="flex items-center gap-4">
        <UserButton />
        <SignOutButton />
      </div>
    </main>
  );
}
