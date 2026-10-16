import Link from "next/link";
import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/auth/membership";

export const metadata = { title: "No access" };

// This page must never call requireMember(), which redirects here.
function AccessFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-5 py-12">
      <Card className="border-border bg-card w-full max-w-xl shadow-none">
        <CardContent className="space-y-5 p-8 sm:p-10">
          <p className="text-xl font-bold tracking-tight">
            Operations Dashboard<span className="text-primary">.</span>
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

export default async function NoAccessPage() {
  const current = await getCurrentMember();

  if (current.ok) {
    // An active member who opened a page they lack the permission for.
    return (
      <AccessFrame title="You don’t have access to this page">
        <p className="text-muted-foreground text-sm leading-6">
          Your account in {current.value.workspace.name} doesn&apos;t include the permission this
          page needs. Ask the workspace owner if you need it.
        </p>
        <Button asChild>
          <Link href="/">Go to the home page</Link>
        </Button>
      </AccessFrame>
    );
  }

  if (current.error === "UNAUTHENTICATED") {
    return (
      <AccessFrame title="Sign in to continue">
        <p className="text-muted-foreground text-sm leading-6">
          You need to sign in before you can open this workspace.
        </p>
        <SignInButton>
          <Button>Sign in</Button>
        </SignInButton>
      </AccessFrame>
    );
  }

  return (
    <AccessFrame title="No access to this workspace">
      <p className="text-muted-foreground text-sm leading-6">
        This account isn&apos;t a member of this workspace. Ask the workspace owner to send an
        invitation to your email address, then sign in with that address.
      </p>
      <p className="text-muted-foreground text-sm leading-6">
        If you signed in with the wrong account, sign out and try another one.
      </p>
      <div className="flex items-center gap-4 pt-2">
        <UserButton />
        <SignOutButton>
          <Button variant="outline">Sign out</Button>
        </SignOutButton>
      </div>
    </AccessFrame>
  );
}
