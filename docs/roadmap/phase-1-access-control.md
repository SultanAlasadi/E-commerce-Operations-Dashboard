# Phase 1: Access control

**Branch:** `feature/authorization` · **Port:** 3001 · **Wave:** 1 (runs in parallel with Phase 2)

Read [README.md](README.md) first.

## Goal

Every protected request is checked in three steps: the Clerk identity, then an active workspace membership in Neon, then the permission it needs. A removed member is locked out at once, even with a valid Clerk session.

## Before you start

- Read `lib/auth/session.ts`, which has `requireClerkUserId()`.
- Read `lib/permissions.ts`: `ALL_PERMISSIONS`, `ROLE_DEFAULT_PERMISSIONS` and `permissionDependencyErrors`.
- Read `lib/server/result.ts`, which has `Result`, `ok` and `fail`.
- Read the `Member` and `MemberPermission` models in `prisma/schema.prisma`. A member's effective permissions are the rows in `MemberPermission`. Owners are stored with every permission.
- Read the PLAN.md §3 "Access" section.

## Steps

1. **Create `lib/auth/membership.ts`.** It implements the contract in README.md exactly: `MemberContext`, `requireMember`, `requirePermission`, `authorize` and `can`.
   - Look up the active member with `removedAt: null`, matched on the Clerk user id, and include its workspace and permissions.
   - If a user is an active member of more than one workspace, v1 uses the oldest membership. Leave a `TODO(phase-8)` there for the brand switcher.
   - Wrap the lookup in React `cache()`. Never read membership or permissions from Clerk session claims.
2. **Split out a lookup function you can test.** Put the database part in `getActiveMembership(clerkUserId, db)` in `lib/server/membership.ts`. It takes `db` like the other services do. The `lib/auth` functions call it, and the database tests can call it without Clerk.
3. **Add an `app/no-access/page.tsx` page.**
   - It explains that the account has no access to this workspace and that they should ask the owner for an invitation.
   - It shows the Clerk `<UserButton />` or a sign-out action, so the user can switch account.
   - Use plain markup. Phase 2 restyles it later.
4. **Update the health route** (`app/api/health/database/route.ts`) only if it needs auth. It is development-only, so most likely leave it alone.
5. **Write the tests.**
   - `lib/server/membership.db.test.ts` covers four cases:
     - an active member is found with the right permissions;
     - a removed member returns nothing;
     - an unknown Clerk id returns nothing;
     - a user in two workspaces gets the oldest membership.
   - `lib/auth/membership.test.ts` mocks the Clerk `auth()` and tests `can` and `authorize` for:
     - not signed in → `UNAUTHENTICATED`;
     - no membership → `NO_ACCESS`;
     - missing permission → `FORBIDDEN`;
     - has permission → `ok`.

## Out of scope

- Invitations and the Team UI (Phase 5).
- Navigation and layouts (Phase 2).
- Any schema change.

## Done when

- The README.md "Done means" checklist passes.
- In the browser:
  - signed in as the owner (`sultanalasadi7@gmail.com`), a test page or the home page calling `requireMember()` renders;
  - signed in as a Clerk user with no membership, it redirects to `/no-access`.
- The PR description shows the final exported function signatures.
