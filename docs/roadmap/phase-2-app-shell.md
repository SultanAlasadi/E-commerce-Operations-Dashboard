# Phase 2: App shell and design system

**Branch:** `feature/app-shell` · **Port:** 3002 · **Wave:** 1 (runs in parallel with Phase 1)

Read [README.md](README.md) first.

## Goal

Build the frame every screen lives in: the design tokens, the base UI components, a desktop sidebar and mobile bottom navigation filtered by permission, empty pages for the five sections, and shared states.

## Before you start

- Look at the designs:
  - `design/00` for the tokens: colours, type, spacing, radius;
  - `design/01` for the desktop shell;
  - `design/11` for the mobile shell;
  - `design/10` for the empty, loading and error states;
  - `design/15` for the limited-user shell.
- Read the README.md contract section. Phase 1 builds `lib/auth/membership.ts` at the same time as you. Code against the contract.
- Tailwind CSS 4 is installed (`@tailwindcss/postcss`). Its config lives in CSS (`@theme` in `app/globals.css`), not in a `tailwind.config.js`.
- `shadcn` is a dev dependency. `lucide-react`, `clsx`, `tailwind-merge` and `class-variance-authority` are installed.
- Read the Next.js 16 docs in `node_modules/next/dist/docs/` on layouts, route groups, `loading.tsx` and `error.tsx` before writing them.

## Steps

1. **Set up the tokens.** Turn `design/00` into CSS variables and `@theme` tokens in `app/globals.css`, including dark mode only if the design has it. Add `lib/utils.ts` with the `cn()` helper.
2. **Initialise shadcn/ui and add only what the shell needs:** button, card, badge, sheet or drawer for mobile, dropdown-menu, separator, skeleton and tooltip. Later phases add their own components.
3. **Clean up `app/layout.tsx`.** It should keep only `<html>`, `<body>` and `<ClerkProvider>`. Move the header out of it.
4. **Create the `app/(app)/` route group.**
   - `layout.tsx` calls `requireMember()` and renders the shell:
     - desktop: sidebar with the workspace name and the `<UserButton />`;
     - mobile: top bar and bottom navigation.
   - Navigation items and the permission each one needs:

     | Item      | Path         | Permission                  |
     | --------- | ------------ | --------------------------- |
     | Dashboard | `/`          | `VIEW_DASHBOARD`            |
     | Sales     | `/sales`     | `VIEW_SALES` or `ADD_SALES` |
     | Platforms | `/platforms` | `MANAGE_PLATFORMS`          |
     | Team      | `/team`      | `MANAGE_TEAM`               |
     | Settings  | `/settings`  | role `OWNER`                |

   - Hide items with `can()`. This is cosmetic only.
5. **Add the five pages** under `app/(app)/`: `page.tsx` (Dashboard), `sales/page.tsx`, `platforms/page.tsx`, `team/page.tsx` and `settings/page.tsx`.
   - Each page calls `requirePermission(...)` for its own permission. Settings checks the owner role instead.
   - Each one renders its title and an empty state for now.
   - Move the current `app/page.tsx` into the group as the Dashboard.
6. **Build shared states** in `components/states/`: `EmptyState`, `ErrorState` with a retry button, and loading skeletons. Add `loading.tsx` and `error.tsx` in `app/(app)/`.
7. **Restyle the Phase 1 page** `app/no-access/page.tsx` with the new tokens, only if Phase 1 has been merged when you finish. Otherwise list it as a follow-up.
8. **Use a temporary stub while Phase 1 is in progress.** If `lib/auth/membership.ts` isn't on `main` yet, create a stub with the exact contract signatures and return a fake owner context. Mark it `// STUB: replaced by Phase 1` and say so in the PR. Whichever phase merges second resolves the conflict by keeping Phase 1's real file.

## Out of scope

- Real content on any page.
- Forms, charts and reports.
- Any `lib/server` or schema change.

## Done when

- The README.md "Done means" checklist passes.
- The shell matches `design/01` at 1440px wide and `design/11` at 390px wide.
- A member with only `VIEW_DASHBOARD` sees only Dashboard in the navigation, and opening `/sales` directly redirects to `/no-access`.
