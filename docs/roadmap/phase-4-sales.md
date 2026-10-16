# Phase 4: Sales

**Branch:** `feature/sales` · **Port:** 3004 · **Wave:** 2 (start after Phases 1 and 2 are merged)

Read [README.md](README.md) first.

## Goal

Staff enter one daily total per platform, see the entries in a list and a calendar, correct or delete them, and view the audit history. Every change is audited.

## Before you start

- Look at the designs:
  - `design/04` and `design/14` for adding sales;
  - `design/03` and `design/13` for the list and calendar;
  - `design/05` for correcting and deleting;
  - `design/06` for the audit history.
- Read `lib/server/sales.ts`:
  - `SalesContext`, `DailySalesRecord` and the `SalesError` codes;
  - the functions `createDailySales`, `correctDailySales`, `deleteDailySales` and `getSalesHistory`.

  These already validate, block future dates and archived platforms, and write the audit row in the same transaction. Reuse them.

- Read `lib/validation/sales.ts` (`dailySalesInputSchema`, `dailySalesCorrectionSchema`) and `lib/dates.ts` (`todayInTimeZone`, `addDays`, `fromDbDate`).
- Read the "Daily sales" and "History" parts of PLAN.md §2, and the sales permissions in §3.

## Rules to respect

- **Money is never a JS float.** Keep amounts as strings or decimals from form to service, and format them with `Intl.NumberFormat` using the workspace currency.
- **"Today" comes from `todayInTimeZone(workspace.timeZone)`**, never from `new Date()` on the server.
- **A duplicate date opens the existing entry** for correction. When the service returns `DUPLICATE`, the UI switches to the correction form for that record.
- **A missing day is not zero.** In the calendar, a missing day looks different from a recorded zero.

## Steps

1. **Add sales** at `app/(app)/sales/new/page.tsx`, or as a dialog from the list. It needs `ADD_SALES`.
   - The fields are platform (active platforms only), business date (defaults to today in the workspace zone), orders and amount.
   - The Server Action calls `authorize("ADD_SALES")` and then `createDailySales({ workspaceId, actorId: ctx.member.id }, input)`.
   - After a failed submit, the typed values stay in the form.
   - Map each error to a message: `FUTURE_DATE`, `BEFORE_TRACKING_START`, `PLATFORM_ARCHIVED` and the rejection of a positive amount with zero orders.
2. **Sales list** at `app/(app)/sales/page.tsx`. It needs `VIEW_SALES`.
   - Members with `ADD_SALES` but not `VIEW_SALES` get only the entry form.
   - The list shows entries for a date range with a platform filter.
   - The calendar view uses one cell per day: recorded, recorded zero, or missing (only from the platform's tracking start date onward).
   - Write a read function, `listDailySales(workspaceId, { from, to, platformId? })`, in `lib/server/sales.ts`. It is the only service change this phase makes, and it gets its own database test.
3. **Correct and delete** (`design/05`).
   - Correct needs `EDIT_SALES` and delete needs `DELETE_SALES`.
   - Delete asks for confirmation. Pass the record's `updatedAt` so the service can return `STALE` if someone else changed it first.
4. **Audit history** (`design/06`). It needs `VIEW_SALES`.
   - Per platform and date, show `getSalesHistory` as a timeline: who, when, the action, and before and after values.
5. **Write tests:**
   - Server Action permission checks for add, edit and delete;
   - a duplicate switches to correction;
   - a stale correction is rejected;
   - the `listDailySales` database test.

## Out of scope

- Dashboard totals and charts (Phase 6).
- Imports.
- Schema changes.

## Done when

- The README.md "Done means" checklist passes.
- On `Opera`, with at least one platform: add an entry, try the same date again (it opens the correction), correct it, delete it, and the audit shows all three actions. Check at desktop and phone width.
