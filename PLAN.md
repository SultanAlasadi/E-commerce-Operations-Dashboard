# E-commerce Operations Dashboard — Implementation Plan

## 1. Product contract

Build an invitation-only internal dashboard for one e-commerce brand. V1 succeeds when the owner can trust a combined view of manually entered sales across stores or accounts and can see where daily data is missing.

V1 includes sales entry and correction, dashboard reporting, platform management, team invitations, roles, custom permissions, audit history, and workspace settings. It excludes tasks, expenses, refunds, exports, automatic imports, AI, offline entry, and billing. Show only working v1 sections in navigation: Dashboard, Sales, Platforms, Team, and Settings, subject to permissions.

Design desktop and mobile flows using the user's Figma work as the reference. Flag major missing behavior for review; complete routine states and essential fields without separate approval.

## 2. Data and behavior

- **Workspace:** Launch with one workspace, one provisioned owner, one reporting currency, and one IANA time zone. Put a workspace boundary on application records to allow separate brands or customers later. The owner sets currency and time zone before the first sale; changing the currency after entries exist requires an explicit data migration.
- **Platform:** One platform represents one store or account, so two stores using the same provider can be separate. Store its name, tracking start date, and archive state. Archiving stops future entry and coverage expectations while preserving historical reporting.
- **Daily sales:** Store one record per workspace, platform, and business date, with a nonnegative whole-number order count and nonnegative decimal amount. The amount is the customer-paid total after discounts, including shipping and tax, before refunds and fees. Allow an explicit zero-orders, zero-revenue record. Reject a positive amount with zero orders and reject future dates. A duplicate date/platform opens the existing record for correction rather than creating a second total.
- **History:** Record actor, time, action, and before/after values for every sales edit or deletion. Preserve records and attribution when a member is removed. Mark manual origin on sales records so later imports can be reconciled without double counting.
- **Reporting:** Calculate AOV as total amount divided by total orders; show it as unavailable when orders are zero. Show three summary panels—today, trailing seven days including today, and the previous calendar month—each with revenue, orders, and AOV. Open charts on the trailing 30 days, with a sales trend and platform comparison. Provide calendar day, week, month, year, and inclusive custom-date filters; calendar weeks start Monday. A platform filter applies to every sales element. Missing platform-days remain unknown, appear as chart gaps, and produce a visible coverage warning on partial combined totals. Coverage begins on each platform's tracking start date.

Neon PostgreSQL is the application source of truth through Prisma. Clerk supplies identity, email-bound invitations, and sessions. Store workspace membership, roles, and permission overrides in Neon.

## 3. Access and application boundaries

- **Owner:** Full access; only the owner changes roles, manager access, workspace settings, and ownership-related configuration. V1 has no in-app ownership transfer.
- **Manager:** Broad operational access by default, subject to owner overrides. A manager can invite or remove members and change a normal user's permission checkboxes only for permissions the manager currently holds. Managers cannot promote users or change another manager's access.
- **Normal user:** Starts with View dashboard only. The owner or authorized manager grants other capabilities through a checkbox panel.
- **Permission set:** View dashboard, View sales, Add sales, Edit sales, Delete sales, Manage platforms, and Manage team members. The dashboard shell requires View dashboard; sales widgets additionally require View sales. Add sales can be entry-only. Edit and Delete sales require View sales and apply to any platform's entries. Anyone with View sales may inspect sales audit history. A removed member loses application access immediately, including with an otherwise valid Clerk session.
- **Enforcement:** Check workspace membership and permissions on the server for every protected read or mutation. Hide inaccessible UI actions as a usability measure, while server checks remain authoritative.

Use Next.js with TypeScript, Server Actions for first-party mutations, and API Routes for service callbacks and future webhooks. Keep validation and authorization in shared server-side business logic. Use Tailwind CSS and shadcn/ui for the interface, React Hook Form and Zod for forms, and Recharts for charts. V1 has no public data API or scheduled reminder job. Reserve REST/webhook integration work, dnd-kit tasks, Vercel Blob invoices, and OpenAI features for later phases.

## 4. Step-by-step delivery

1. **Confirm design and dependencies.** Inventory the Figma screens against the product contract. Resolve major omissions with the owner. Verify official documentation and compatibility for the current stable versions of the agreed libraries, then pin exact versions.
2. **Establish the project and environments.** Set up Next.js, TypeScript, styling, linting, formatting, Vitest, and Playwright. Configure local, Vercel preview, and production environments with separate nonproduction data and secrets.
3. **Build identity and authorization.** Provision the first owner, implement email-bound invitation acceptance, workspace membership, role defaults and overrides, removal, and server-side permission checks. Build the Team permission panel.
4. **Build the sales data layer.** Add workspace, platform, daily-sales, membership, permission, and audit models with database constraints. Implement validated add, edit, delete, archive, and backfill operations.
5. **Build staff and owner flows.** Implement the single-platform sales form, sales list and correction flow, platform management, settings, permission-aware navigation, empty states, loading states, and retryable errors. Preserve unsaved form values after a failed online submission.
6. **Build reporting.** Implement period and platform filters, three summary panels, trend and comparison charts, coverage indicators, partial-total warnings, and consistent currency/time-zone formatting.
7. **Harden and release.** Add operational error and key-action monitoring. Establish and test a recovery path that can restore at least a recent daily point. Run permission, calculation, invitation, correction, coverage, and mobile/desktop end-to-end checks in preview before production release.

## 5. Acceptance and remaining risks

V1 is ready when the owner can configure the workspace, add and archive platforms, invite staff, assign permissions, and see correct combined and filtered figures; staff can enter and correct authorized daily totals; missing data is never presented as a confirmed zero; and unauthorized reads and writes fail on the server. Automated tests cover these journeys, including removed members, zero-sales days, duplicate dates, partial coverage, audit history, and failed submissions.

Before production, verify that the chosen Neon and hosting tiers support the daily recovery requirement within the lowest practical budget. If they do not, add a separate daily backup process and test restoration. The available Figma designs and current provider capabilities are inputs to validate during delivery, not reasons to change the agreed stack silently. Later phases may add shared-team task and expense permissions, daily-total imports with review before replacing manual entries, and separate customer workspaces.
