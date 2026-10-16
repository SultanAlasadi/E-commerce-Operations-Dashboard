# Phase 5: Team and invitations

**Branch:** `feature/team` · **Port:** 3005 · **Wave:** 2 (start after Phases 1 and 2 are merged)

Read [README.md](README.md) first.

## Goal

The owner, or a manager allowed to, invites people by email, sets their role and permission checkboxes, and removes them. A removed person loses access at once.

## Before you start

- Look at `design/08` (team and invitations). There is no design for editing or removing a member: build those in the same style.
- Read the `Invitation`, `Member` and `MemberPermission` models in `prisma/schema.prisma`:
  - an invitation stores the role and permissions to grant, `clerkInvitationId` and `expiresAt`;
  - only one pending invitation is allowed per email.
- Read `lib/permissions.ts`: `ROLE_DEFAULT_PERMISSIONS` and `permissionDependencyErrors`.
- Read PLAN.md §3 in full, especially the manager limits.
- Read the Clerk docs for the installed `@clerk/nextjs` version on invitations (`clerkClient().invitations.createInvitation`, `revokeInvitation`) and on webhook verification (`verifyWebhook`). Clerk is in "Invite only" mode.

## Rules to respect (PLAN §3)

- **Owner:** may do everything, including changing roles and a manager's access.
- **Manager:**
  - may invite and remove members;
  - may change a USER's checkboxes, but only for permissions the manager has;
  - may not promote anyone or change another manager.
- **User:** starts with `VIEW_DASHBOARD` only.
- **Dependencies:** `EDIT_SALES` and `DELETE_SALES` require `VIEW_SALES`. Use `permissionDependencyErrors`.
- **Removing a member** sets `removedAt` and `removedById`. Never delete the row, because audit rows point to it.

## Steps

1. **Put the rules in one service.** Create `lib/server/team.ts` with:
   - `inviteMember`
   - `revokeInvitation`
   - `acceptInvitation`
   - `updateMemberAccess`
   - `removeMember`

   Each one takes the actor's `MemberContext` and returns a `Result`. Put the manager limits in a pure function in `lib/permissions.ts`, for example `canChangeAccess(actor, target, newPermissions)`, so they can be unit-tested.

2. **Invite.**
   1. The service creates the `Invitation` row.
   2. It calls Clerk `createInvitation`, with the redirect URL set to `/sign-in`.
   3. It stores `clerkInvitationId`.
   4. If Clerk fails, it rolls back or marks the invitation as failed. Never leave a pending row without a Clerk invitation.
3. **Accept.**
   - Add `app/api/webhooks/clerk/route.ts` for the `user.created` event. Verify the signature with a `CLERK_WEBHOOK_SIGNING_SECRET` variable, and add that name to `.env.example`.
   - Find the pending, unexpired invitation by email. In one transaction, create the `Member` and its permissions and mark the invitation `ACCEPTED`.
   - **Fallback:** `requireMember()` misses for a signed-in user who has a pending invitation for their email (for example, when the webhook is late). The no-access page offers "Accept invitation", which calls the same `acceptInvitation`. Coordinate this with the Phase 1 code by calling the service only; don't rewrite `lib/auth`.
4. **Team page** at `app/(app)/team/page.tsx`. It needs `MANAGE_TEAM`.
   - It lists members (name, email, role, status) and pending invitations, with revoke and resend.
   - **Invite dialog:** email, role and the permission checkboxes, prefilled from `ROLE_DEFAULT_PERMISSIONS`.
   - **Edit access:** a checkbox panel. Checkboxes the actor may not change are disabled and explain why.
   - **Remove:** a confirmation that explains the person loses access immediately and their history stays.
5. **Write tests:**
   - unit tests for `canChangeAccess`, covering every rule above;
   - database tests for accepting (creates the member and its permissions);
   - database tests for removing (the person then fails `getActiveMembership`);
   - database tests for a duplicate pending invitation;
   - webhook signature rejection.

## Out of scope

- Ownership transfer (not in v1).
- Brand creation (Phase 8).
- Schema changes. If you believe one is needed, stop and ask.

## Done when

- The README.md "Done means" checklist passes.
- End to end in development:
  1. The owner invites a second email.
  2. That person accepts and signs in, and sees only what was granted.
  3. The owner removes them.
  4. Their next request lands on `/no-access` while they are still signed in to Clerk.
- The PR notes the Clerk Dashboard steps the owner must do: create the webhook endpoint and copy the signing secret.
