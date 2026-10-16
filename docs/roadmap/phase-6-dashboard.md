# Phase 6: Dashboard reporting

**Branch:** `feature/dashboard` · **Port:** 3006 · **Wave:** 2 (start after Phases 1 and 2 are merged)

Read [README.md](README.md) first.

## Goal

The owner sees trustworthy combined and per-platform figures, and missing days are always visible, never shown as zero.

## Before you start

- Look at the designs:
  - `design/01` for complete data;
  - `design/02` for incomplete data and the coverage warning;
  - `design/11` and `design/12` for mobile;
  - `design/15` for a user without View sales.
- Read the PLAN.md §2 "Reporting" section in full, and the AOV and coverage rules in `AGENTS.md`.
- Read `lib/dates.ts`. All date ranges are business dates in the workspace time zone.
- `recharts` is installed.

## Rules to respect

- **AOV = sum(amount) / sum(orders).** When orders are 0, AOV is unavailable; show "—", never 0 or ∞.
- **Coverage:**
  - A platform-day is _expected_ from the platform's `trackingStartDate`, up to its archive date or the end of the range.
  - A _missing_ platform-day has no record. A record of 0/0 is a _recorded zero_ and counts as covered.
- **Today** is not counted as missing until the day has ended in the workspace time zone (a decision already made).
- **Partial totals:** if any expected platform-day in the range is missing, the totals carry a visible warning. AOV is still shown, with the warning.
- **Charts:** missing days are gaps in the line, not drops to zero.
- **Money:** sum in SQL or with `Prisma.Decimal`, never with JS floats. Format with `Intl.NumberFormat` and the workspace currency.

## Steps

1. **Create the report service `lib/server/reports.ts`** (read-only; this phase owns the file).
   - `getSummary(workspaceId, { from, to, platformId? })` returns:
     - revenue, orders and AOV, with AOV `null` when orders are 0;
     - `expectedDays`, `coveredDays` and `missing: { platformId, date }[]`.
   - `getDailySeries(workspaceId, { from, to, platformId? })` returns per-day revenue and orders, `null` when no platform reported that day.
   - `getPlatformComparison(workspaceId, { from, to })` returns per-platform totals and coverage.
   - Use `$queryRaw` with `generate_series` over business dates, or a grouped Prisma query plus coverage computed in TypeScript. Either way, scope every query by `workspaceId`.
2. **Write the period helpers** in `lib/dates.ts`, with unit tests: today, the trailing 7 days including today, the previous calendar month, a calendar week starting Monday, month, year, and an inclusive custom range.
3. **Dashboard page** at `app/(app)/page.tsx`. It needs `VIEW_DASHBOARD`.
   - It always renders the shell.
   - The sales widgets render only with `can(ctx, "VIEW_SALES")`. Otherwise show the `design/15` message.
   - **Summary panels:** today, the last 7 days, and the previous month. Each shows revenue, orders and AOV, plus a coverage badge.
   - **Charts:** a 30-day trend (line with gaps) and a platform comparison (bars).
   - **Filters:** period (day, week, month, year, custom) and platform. Keep them in the URL search params, so they survive a reload and can be shared. The platform filter applies to every sales element.
   - **Coverage warning:** list the missing platform-days, with a link to add each one for users with `ADD_SALES`. The link targets Phase 4's add route; if that route isn't merged yet, use `/sales/new?platformId=&date=` and note it in the PR.
4. **Write tests.** These matter most in the whole MVP. Database tests for `reports.ts` cover:
   - complete data;
   - a missing day;
   - a recorded zero;
   - a platform starting mid-range;
   - an archived platform;
   - zero orders giving AOV `null`;
   - today not counted as missing;
   - time zone edges, with the workspace in `Asia/Riyadh` and the server in UTC.

## Out of scope

- Exports.
- Imports.
- New sales-entry screens (Phase 4).

## Done when

- The README.md "Done means" checklist passes.
- With seeded data, run only when no other agent is active (see README rule 5), the dashboard matches `design/01` and `design/02`, and the totals match a hand calculation from the seed.
