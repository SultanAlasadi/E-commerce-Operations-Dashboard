# E-commerce Operations Dashboard

An invitation-only dashboard for one e-commerce brand. The full product scope and acceptance criteria are in [PLAN.md](PLAN.md). The database layer (schema, migrations, data services, seed and tests) and Clerk sign-in are in place. No dashboard screens have been built yet.

## What we will build

- **Dashboard:** Revenue, orders, and average order value for today, the trailing seven days, and the previous calendar month; trends, platform comparisons, date and platform filters, and clear warnings when daily data is missing.
- **Sales:** Manual daily totals per store or account, including explicit zero-sales days, corrections, deletions, and an audit history.
- **Platforms:** Separate records for each store or account, tracking start dates, and archiving that preserves history.
- **Team:** Email invitations, owner/manager/user roles, custom permissions, and immediate loss of access when a member is removed.
- **Settings:** One workspace's reporting currency and time zone, with server-enforced access controls.
- **Release checks:** Permission, calculation, invitation, correction, coverage, and desktop/mobile tests; monitoring and a tested daily recovery path.

V1 excludes tasks, expenses, refunds, exports, automatic imports, AI features, offline entry, and billing.

## Planned stack

| Area                  | Choice                                                    |
| --------------------- | --------------------------------------------------------- |
| Application           | Next.js App Router, React, TypeScript                     |
| Identity and sessions | Clerk                                                     |
| Database              | Neon PostgreSQL, Prisma ORM and Neon adapter              |
| Interface             | Tailwind CSS, shadcn/ui, Lucide icons                     |
| Forms and validation  | React Hook Form, Zod                                      |
| Charts                | Recharts                                                  |
| Quality tools         | ESLint, Prettier, Vitest, Playwright                      |
| Hosting               | Vercel, with separate preview and production environments |

Dependencies are pinned to exact versions in `package.json` and `package-lock.json` (add new ones with `npm install --save-exact`). npm is the package manager; Node.js 24.

## Scripts

| Command                                       | What it does                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run dev`                                 | Generates the Prisma client if the schema changed, then starts Next.js on http://localhost:3000 |
| `npm run build`                               | Production build (see the local build note below)                                               |
| `npm run lint` / `typecheck` / `format:check` | ESLint, TypeScript, Prettier                                                                    |
| `npm test`                                    | Vitest unit tests, plus database tests when `NEON_BRANCH` is a non-production branch            |
| `npm run e2e`                                 | Playwright (Chromium and Firefox)                                                               |
| `npm run db:migrate`                          | Create/apply a migration on the current Neon branch (development only)                          |
| `npm run db:deploy`                           | Apply committed migrations (CI / production)                                                    |
| `npm run db:status` / `db:seed` / `db:studio` | Migration status, development seed, Prisma Studio                                               |

Copy `.env.example` to `.env.local` for the variable names. Never commit real values.

## Database

Neon Postgres is the source of truth, accessed through Prisma 7 with the Neon adapter. The project has a `production` branch and a persistent `development` branch; `.env.local` points at `development` (`NEON_BRANCH`). The app uses the pooled `DATABASE_URL`; the Prisma CLI uses the direct `DATABASE_URL_UNPOOLED` (see `prisma.config.ts`).

- **Schema:** `prisma/schema.prisma` — Workspace, Member, MemberPermission, Invitation, Platform, DailySales, SalesAudit. The generated client lives in `generated/prisma` (gitignored) and is imported from `@/generated/prisma/client`.
- **Rules in the database:** one record per platform per business date; non-negative orders and amount; no positive amount with zero orders; one active owner per workspace; one pending invitation per email; records can only reference platforms in their own workspace. CHECK constraints are hand-written at the end of the `init` migration.
- **Data services:** `lib/server/{sales,platforms,workspace}.ts`. Every sales create, correction and deletion writes its audit row in the same transaction. Services take an explicit workspace and actor; membership and permission checks wrap them when the app screens are built.
- **Seed:** `npm run db:seed` rebuilds the "North Coast Co." demo workspace from the designs (missing day, recorded zero, archived platform, a correction and a deletion). It refuses to run unless `NEON_BRANCH=development`.
- **Migrations:** create them only against `development` with `npm run db:migrate`. Production receives committed migrations through `npm run db:deploy`.

During local development, `GET /api/health/database` returns `{ "ok": true }` when the database is reachable; it returns 404 in production.

## Authentication

Clerk provides sign-in and sessions (`proxy.ts`, `<ClerkProvider>` in `app/layout.tsx`, `/sign-in`). The app is invitation-only: there is no public sign-up button, and **Access mode must be set to "Invite only" in the Clerk Dashboard** (Configure → Restrictions; Clerk previously called this "Restricted"). Access is not path-based: every protected page, layout, Server Action and Route Handler checks identity (`lib/auth/session.ts`) and then workspace membership and permissions in Neon. Invitations, membership checks and webhooks are not built yet.

## Local machine notes

- The project lives at `C:ProjectsOpera` (NTFS). Keep it off FAT32/exFAT drives and out of OneDrive-synced folders: Turbopack and `next build` fail there.
- **`prisma generate` EPERM:** VS Code's TypeScript server can hold `generated/prisma` open. `scripts/prisma-generate.mjs` retries, and `.vscode/settings.json` stops the editor from watching `generated/`. If it still fails, run "TypeScript: Restart TS Server" and retry.
- Playwright's WebKit build fails to start on this host (missing DLLs), so e2e runs Chromium and Firefox only.

## Inputs still needed

- Vercel project access for preview and production deployment.
- The initial owner's email address, and the real workspace currency, time zone and platforms with tracking start dates.
- A decision on the daily restore target and acceptable hosting/database budget before release.

## Next phase

Resolve the open design questions, then build identity and authorization (membership, invitations, permission checks), then the Sales, Platforms, Settings and Dashboard screens in the order described in the plan.
