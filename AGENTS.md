<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project: E-commerce Operations Dashboard

`PLAN.md` is the product contract; read it before changing behavior. `design/*.png` are the reference screens (00 = design tokens, 01–10 desktop, 11–15 mobile). If the plan and a design disagree, follow the plan and flag the conflict. Do not resolve it silently.

### Stack facts that differ from older defaults

- Next.js 16: request interception lives in `proxy.ts` (exported `proxy` function, Node runtime). `middleware.ts` is deprecated; do not create it. Clerk's `clerkMiddleware()` is exported from `proxy.ts`.
- Prisma 7: the client is generated to `generated/prisma` (gitignored) and imported from `@/generated/prisma/client`, not `@prisma/client`. Get the client only through `getPrisma()` in `lib/prisma.ts`. The runtime uses `DATABASE_URL` (pooled) with the Neon adapter. The Prisma CLI and migrations use `DATABASE_URL_UNPOOLED` through `prisma.config.ts`.
- Prisma 7 partial unique indexes use the `partialIndexes` preview feature (`@@unique(..., where: raw(...))`). CHECK constraints can't be modeled; add them by hand to the migration SQL (Prisma ignores them when diffing).
- Neon branches back each environment (`NEON_BRANCH`). Run migrations only against `development` (`npm run db:migrate`). Production gets committed migrations through `npm run db:deploy`.
- Clerk: `createRouteMatcher` and path-based protection in `proxy.ts` are deprecated. Check auth inside each page, layout, Server Action and Route Handler instead (`lib/auth/session.ts`, then the membership check).
- Local machine: the project lives at `C:ProjectsOpera` (NTFS). If `prisma generate` fails with EPERM, the VS Code TS server is holding `generated/prisma`: restart it and retry. Never run generate, build or migrate while `next dev` is running.
- Dependencies are pinned to exact versions. Add new ones with `npm install --save-exact`.

### Domain invariants (enforce in the database and in server logic)

- Every application row carries `workspaceId`, and every query is scoped by it.
- Money is `Decimal(14,2)` in Postgres and is handled as a decimal or as integer minor units in code. Never use JS floats for stored or summed money.
- A business date is a Postgres `DATE`, a calendar day in the workspace's IANA time zone. Never store it as a timestamp, and never derive "today" from the server's local time.
- A daily sales record is unique on (workspaceId, platformId, businessDate). Orders must be an integer ≥ 0 and amount ≥ 0. A positive amount with zero orders is rejected, and so is a future date.
- A missing record means unknown, never zero. An explicit 0/0 record is a "recorded zero". Expected coverage starts at the platform's tracking start date and stops when the platform is archived.
- AOV = sum(amount) / sum(orders). It is unavailable when orders are 0.
- Every sales create, edit, or delete writes an audit row in the same transaction (actor, time, action, before, after). Audit rows are keyed by (platformId, businessDate), not by the record's id, so history survives delete-then-recreate.

### Authorization

- Authorization lives in shared server code (`lib/auth/*`). Every Server Action, Route Handler, and data loader calls it, and it checks Clerk identity, then an active workspace membership in Neon, then the permission. UI hiding is cosmetic only.
- A removed member has no access even while their Clerk session is still valid, so membership is re-checked against the database on every request, never read from session claims alone.

### Conventions

- Mutations are Server Actions validated with the same Zod schema the form uses (`lib/validation/*`). Route Handlers are only for webhooks and callbacks.
- Database writes go through the services in `lib/server/*`. They return `Result` values (`lib/server/result.ts`) for expected outcomes such as DUPLICATE or STALE, and throw only on real failures. Business dates go through `lib/dates.ts`.
- Database tests (`*.db.test.ts`) create and delete their own workspace and skip themselves when `NEON_BRANCH` is unset or is `production`.
- Before considering a change done, run `npm run lint`, `npm run typecheck`, and the relevant tests.

### Protected rules — never cross

These apply to every agent (Claude, Codex, any other) working on a phase. If a rule blocks the work, stop and ask the owner. Never work around it.

1. **Stay in scope.** Change only the files your phase file in `docs/roadmap/` names. If something else looks wrong, list it under "Follow-ups" in the PR; do not fix it.
2. **No unrequested refactoring.** Do not rename, move, restructure, reformat or "clean up" existing code your phase does not need. Do not change existing function signatures or `Result` error codes; add new functions instead.
3. **Never edit these files** on a phase branch:
   - `prisma/schema.prisma` and `prisma/migrations/**`
   - `PLAN.md`, `AGENTS.md`, `docs/roadmap/**` and `design/**`
   - `.claude/**`, `.github/**` and `scripts/scope/**`
4. **Never change the product rules.** These are already enforced in code; keep them exactly as they are:
   - the business-date, money, AOV and "missing means unknown, never zero" rules above;
   - the audit row written in the same transaction;
   - the auth order: Clerk identity, then active membership in Neon, then permission.

   Do not weaken a check to make a test or a build pass.
5. **No new dependencies** unless your phase file needs them. Add them with `npm install --save-exact` and list them in the PR.
6. **Format only your own files.** Run Prettier on the files you created or changed, never on the whole repo.
7. **Never merge, push to `main`, force-push or rewrite history.** Open a PR; the owner merges after review.
8. **Check your scope before opening the PR:** run `node scripts/scope/check-scope.mjs`. The same check runs on GitHub for every PR, and a PR that fails it will not be merged.
