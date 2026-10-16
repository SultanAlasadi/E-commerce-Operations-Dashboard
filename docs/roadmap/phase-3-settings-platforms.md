# Phase 3: Settings and Platforms

**Branch:** `feature/settings-platforms` · **Port:** 3003 · **Wave:** 2 (start after Phases 1 and 2 are merged)

Read [README.md](README.md) first.

## Goal

The owner can edit the workspace settings, and anyone with Manage platforms can add, rename, archive and restore platforms.

## Before you start

- Look at `design/09` (Settings) and `design/07` (Platforms and the archive flow).
- Read the services: `lib/server/workspace.ts` (`getWorkspace`, `updateWorkspaceSettings`) and `lib/server/platforms.ts` (`listPlatforms`, `createPlatform`, `updatePlatform`, `setPlatformArchived`). Reuse them; don't write new Prisma queries in pages.
- Read the validation in `lib/validation/workspace.ts`: `workspaceSettingsSchema` and `platformInputSchema`.
- Read PLAN.md §2 on the workspace and platform rules.

## Steps

1. **Settings page** (`app/(app)/settings/page.tsx`, owner only).
   - **Form:** workspace name, currency and IANA time zone, using React Hook Form with `workspaceSettingsSchema` through `@hookform/resolvers/zod`.
   - **Server Action** in `app/(app)/settings/actions.ts`:
     1. call `authorize(...)` and check `ctx.member.role === "OWNER"`;
     2. call `updateWorkspaceSettings(ctx.workspace.id, input)`;
     3. return the `Result`.
   - Show `CURRENCY_LOCKED` as a clear message next to the currency field.
2. **Platforms page** (`app/(app)/platforms/page.tsx`, needs `MANAGE_PLATFORMS`).
   - A list of active and archived platforms, showing name, provider, tracking start date and status.
   - Add and edit happen in a dialog on desktop and a sheet on mobile. The fields are name, provider (optional) and tracking start date.
   - **Archive** asks for confirmation and explains that history stays visible but new entries stop. **Restore** brings an archived platform back.
   - Each mutation gets a Server Action in `app/(app)/platforms/actions.ts` that calls `authorize("MANAGE_PLATFORMS")` and then the service.
   - Map each service error to a message by the field: `NAME_TAKEN`, `START_AFTER_SALES` and `NOT_FOUND`.
   - **Empty state:** "No platforms yet" with an Add button.
3. **Revalidate** after each mutation with `revalidatePath`. Check the Next.js 16 docs for the current API.
4. **Keep the form on failure.** After a failed submit, the typed values stay in the form.
5. **Write tests** for the Server Actions:
   - an owner can save settings; a manager cannot;
   - a user without `MANAGE_PLATFORMS` gets `FORBIDDEN`;
   - a duplicate platform name shows `NAME_TAKEN`.

## Out of scope

- Sales entry (Phase 4).
- Changing the currency after sales exist; the service already blocks it.

## Done when

- The README.md "Done means" checklist passes.
- On the `Opera` workspace, you can add a platform, rename it, archive it and restore it, and settings save, at both desktop and phone width.
