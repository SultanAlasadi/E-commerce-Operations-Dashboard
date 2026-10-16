# Phase 8: New-brand admin page (after the MVP)

**Branch:** `feature/brand-admin` · **Start:** only after v1 is released and the owner asks for it.

Read [README.md](README.md) first.

## Goal

The platform operator can onboard a new brand from a web page instead of running `npm run owner:provision`, and a person who belongs to several brands can switch between them.

## Steps (to be detailed when this phase starts)

1. **Choose how the operator is identified.** For example, a `PLATFORM_ADMIN_CLERK_IDS` allowlist in the environment, or a Clerk public-metadata flag. It must be checked on the server, the same way as Phase 1.
2. **Admin page `/admin/brands`:** list the workspaces; a "New brand" form for name, currency, time zone and owner email.
3. **Create the brand:** the workspace, plus an owner invitation through the Phase 5 invitation service, so the owner doesn't need to exist in Clerk yet. Retire `scripts/provision-owner.ts`, or keep it for emergencies.
4. **Brand switcher:**
   - remove the "oldest membership" rule from `requireMember()`;
   - store the active workspace, in a cookie checked against an active membership on every request;
   - add a switcher to the shell.
5. **Tests:** non-operators are refused; workspaces are isolated (no cross-brand reads); switching only works to brands where the person has an active membership.
