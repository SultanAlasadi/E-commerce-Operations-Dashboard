# MVP roadmap

This folder splits the v1 MVP into phases that separate agents (Claude chats, Codex) can work on, some at the same time. Each phase has its own file. Read this file first, then only your phase file.

`PLAN.md` is the product contract and `AGENTS.md` holds the engineering rules. Both win over anything here. If they disagree with a phase file, stop and report the conflict in your PR instead of choosing silently.

## Phases

| Phase         | File                                                           | Branch                       | Depends on                          |
| ------------- | -------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| 1             | [phase-1-access-control.md](phase-1-access-control.md)         | `feature/authorization`      | —                                   |
| 2             | [phase-2-app-shell.md](phase-2-app-shell.md)                   | `feature/app-shell`          | Contract below (not Phase 1's code) |
| 3             | [phase-3-settings-platforms.md](phase-3-settings-platforms.md) | `feature/settings-platforms` | 1 and 2 merged                      |
| 4             | [phase-4-sales.md](phase-4-sales.md)                           | `feature/sales`              | 1 and 2 merged                      |
| 5             | [phase-5-team.md](phase-5-team.md)                             | `feature/team`               | 1 and 2 merged                      |
| 6             | [phase-6-dashboard.md](phase-6-dashboard.md)                   | `feature/dashboard`          | 1 and 2 merged                      |
| 7             | [phase-7-release.md](phase-7-release.md)                       | `release/v1`                 | 1–6 merged                          |
| 8 (after MVP) | [phase-8-brand-admin.md](phase-8-brand-admin.md)               | `feature/brand-admin`        | 7 released                          |

## Waves

- **Wave 1 (parallel):** Phase 1 and Phase 2.
- **Wave 2 (parallel, up to 3 at once):** Phases 3, 4, 5 and 6. Start after Phases 1 and 2 are merged into `main`.
- **Wave 3 (one agent):** Phase 7.

## Rules for every agent

1. **Stay in your phase.** Build only what your phase file lists. Write down anything else you notice under "Follow-ups" in your PR.
2. **Use your own folder.** Never share a working folder with another agent. Create a git worktree from an up-to-date `main`:
   ```powershell
   git -C C:\Projects\Opera fetch
   git -C C:\Projects\Opera worktree add C:\Projects\Opera-<phase> -b <branch> origin/main
   cd C:\Projects\Opera-<phase>
   Copy-Item C:\Projects\Opera\.env.local .
   npm ci
   npm run db:generate
   ```
3. **Use your own port.** Phase N runs `npx next dev -p 300N`, for example `-p 3004` for Phase 4. Port 3000 belongs to the main folder.
4. **Leave the database schema alone.** Do not edit `prisma/schema.prisma` or add migrations. If your phase really needs a schema change, stop and ask the owner. Only one phase may change the schema at a time.
5. **Don't run the seed.** `npm run db:seed` rebuilds shared demo data on the `development` branch, so run it only when no other agent is working. Database tests create and delete their own workspace and are safe to run.
6. **Shared files have one owner.** Change a file owned by another phase only if your phase file says so:

   | Files                                                                                      | Owner                                                                                         |
   | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
   | `lib/auth/*`, `app/no-access/*`                                                            | Phase 1                                                                                       |
   | `app/layout.tsx`, `app/(app)/layout.tsx`, navigation, `components/ui/*`, `app/globals.css` | Phase 2                                                                                       |
   | `lib/server/reports.ts`                                                                    | Phase 6                                                                                       |
   | `app/api/webhooks/*`                                                                       | Phase 5                                                                                       |
   | `package.json`, `package-lock.json`                                                        | Anyone. List the packages you added in your PR, and add them with `npm install --save-exact`. |

7. **Done means:**
   - `npm run lint`, `npm run typecheck` and `npm test` all pass.
   - You checked the screens in the browser at desktop and phone width.
   - The PR into `main` lists what was built, what was tested and the follow-ups.
   - Commit messages end with your tool's attribution line. Do not merge your own PR: the owner merges after review.

## Contract between Phase 1 and the other phases

Phase 1 implements these functions in `lib/auth/membership.ts`. Phases 2–6 call them and may assume this exact shape before Phase 1 is merged.

```ts
import type { Member, Workspace, Permission } from "@/generated/prisma/client";

export type MemberContext = {
  member: Member; // active member (removedAt is null)
  workspace: Workspace;
  permissions: ReadonlySet<Permission>;
};

/** Signed-in user's active membership, read from Neon on every call.
 *  Not signed in → redirect to /sign-in. No active membership → redirect to /no-access. */
export function requireMember(): Promise<MemberContext>;

/** requireMember() plus a permission check. Missing permission → redirect to /no-access in
 *  pages/layouts. In Server Actions, use the non-redirecting variant below. */
export function requirePermission(permission: Permission): Promise<MemberContext>;

/** For Server Actions: never redirects; returns a Result (lib/server/result.ts). */
export function authorize(
  permission: Permission,
): Promise<Result<MemberContext, "UNAUTHENTICATED" | "NO_ACCESS" | "FORBIDDEN">>;

/** Pure check for hiding UI. Cosmetic only; the server check is authoritative. */
export function can(ctx: MemberContext, permission: Permission): boolean;
```

`requireMember` is wrapped in React `cache()`, so a layout and a page in the same request share one lookup.

## Product decisions already made

- New brands are added by hand with `npm run owner:provision` (see `scripts/provision-owner.ts`). There is no self sign-up in v1.
- The Team edit and remove screens have no design; build them in the style of `design/08`.
- Today is not counted as missing until the day has ended in the workspace's time zone.
- AOV is shown on partial data, together with the coverage warning.
- A member with View dashboard but not View sales sees the dashboard shell without sales widgets (`design/15`).
