# Phase 7: Hardening and release

**Branch:** `release/v1` · **Wave:** 3 (one agent, after Phases 1–6 are merged)

Read [README.md](README.md) first. Several steps here touch production or the owner's accounts. **Ask the owner before each of those steps; never run them on your own.**

## Goal

v1 runs in production on Vercel, with separate preview data, monitoring, a tested recovery path, and end-to-end tests for the PLAN.md §5 acceptance journeys.

## Steps

1. **End-to-end tests** (Playwright is configured in `playwright.config.ts`).
   - Use Clerk testing tokens or test users on the development instance. Check the current Clerk docs for Playwright.
   - Cover these journeys, at desktop and mobile sizes:
     - the owner sets up the workspace and adds and archives a platform;
     - the owner invites a user; the user enters sales and corrects them;
     - a duplicate date opens the correction;
     - a zero-sales day;
     - partial coverage shows the warning;
     - the audit history;
     - a removed member is refused;
     - a failed submit keeps the form values.
2. **Vercel** (ask the owner first).
   - Create the project from the GitHub repo.
   - Set environment variables per environment:
     - **Preview** uses the Neon `development` branch, or a per-preview branch, and the Clerk development keys.
     - **Production** uses the Neon `production` branch and the Clerk production keys.
   - Never share data between preview and production.
3. **Production database** (ask the owner first).
   - Run `npm run db:deploy` against `production`, with `NEON_BRANCH=production` and the production URLs.
   - Never run `db:migrate` or `db:seed` there.
4. **Production Clerk** (the owner does this in the Clerk Dashboard; you give them the steps):
   - Set Access mode to "Invite only".
   - Set up the domain and the webhook endpoint (from Phase 5) with its signing secret.
5. **First owner in production** (ask the owner first). Run `npm run owner:provision` with the production environment and the owner's email, brand name, currency and time zone.
6. **Monitoring.**
   - Add error monitoring. Propose a provider to the owner first; Sentry is the usual choice.
   - Log key actions: sales created, corrected and deleted, invitations, removals.
7. **Recovery.**
   - Confirm the Neon plan's restore window covers at least one daily point.
   - Do a test restore into a temporary branch, check the data, delete the branch, and write the steps in `docs/runbooks/restore.md`.
   - If the plan can't do this, propose a daily `pg_dump` backup instead.
8. **Release checklist** in `docs/runbooks/release.md`: migrations, environment variables, the Clerk settings, the smoke test and rollback.

## Done when

- `npm run lint`, `npm run typecheck`, `npm test` and `npm run e2e` all pass.
- The production URL works for the owner.
- A second invited user works, and removing them blocks access.
- The restore has been tested and documented.
