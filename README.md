# E-commerce Operations Dashboard

An invitation-only dashboard for one e-commerce brand. The full product scope and acceptance criteria are in [PLAN.md](PLAN.md). This repository currently contains only the minimal Next.js starter app and installed dependencies. No dashboard features, database schema, or service configuration have been created.

## What we will build

- **Dashboard:** Revenue, orders, and average order value for today, the trailing seven days, and the previous calendar month; trends, platform comparisons, date and platform filters, and clear warnings when daily data is missing.
- **Sales:** Manual daily totals per store or account, including explicit zero-sales days, corrections, deletions, and an audit history.
- **Platforms:** Separate records for each store or account, tracking start dates, and archiving that preserves history.
- **Team:** Email invitations, owner/manager/user roles, custom permissions, and immediate loss of access when a member is removed.
- **Settings:** One workspace's reporting currency and time zone, with server-enforced access controls.
- **Release checks:** Permission, calculation, invitation, correction, coverage, and desktop/mobile tests; monitoring and a tested daily recovery path.

V1 excludes tasks, expenses, refunds, exports, automatic imports, AI features, offline entry, and billing.

## Planned stack

| Area | Choice |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Identity and sessions | Clerk |
| Database | Neon PostgreSQL, Prisma ORM and Neon adapter |
| Interface | Tailwind CSS, shadcn/ui, Lucide icons |
| Forms and validation | React Hook Form, Zod |
| Charts | Recharts |
| Quality tools | ESLint, Prettier, Vitest, Playwright |
| Hosting | Vercel, with separate preview and production environments |

Dependencies are pinned to exact versions in `package.json` and `package-lock.json`. npm is the package manager. Node.js 24 is available locally.

Run `npm run dev` to start the empty starter page locally. `npm run build`, `npm run lint`, and `npm run typecheck` check the scaffold.

Playwright's Chromium and Firefox binaries launch locally. WebKit downloaded, but its current Windows build fails to start because the host reports missing DLL dependencies. This needs a working WebKit host or browser build before WebKit tests can run.

## Inputs needed before implementation

- Access to the Figma designs so the screens and flows can be checked against the plan.
- A Neon project and separate nonproduction and production database connections, or access to create them.
- A Clerk application and its environment keys, or access to create it; the initial owner's email address.
- Vercel project access for preview and production deployment.
- The workspace's reporting currency, IANA time zone, and initial platforms with their tracking start dates.
- A decision on the daily restore target and acceptable hosting/database budget before release.

Share secrets through the providers' environment settings when we reach configuration; they should not be committed to this repository.

## Next phase

Review the Figma screens against `PLAN.md`, configure the application and environments, then build identity, sales, reporting, and release checks in the order described in the plan.
