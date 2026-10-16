import { describe, expect, it } from "vitest";
import type { Member, Permission, Workspace } from "@/generated/prisma/client";
import type { MemberContext } from "@/lib/auth/membership";
import { visiblePaths } from "./visible-paths";

function context(role: Member["role"], permissions: Permission[]): MemberContext {
  return {
    member: { role } as Member,
    workspace: {} as Workspace,
    permissions: new Set(permissions),
  };
}

describe("permission-aware navigation", () => {
  it("shows only Dashboard to a dashboard-only member", () => {
    expect(visiblePaths(context("USER", ["VIEW_DASHBOARD"]))).toEqual(["/"]);
  });

  it("shows Sales to entry-only members", () => {
    expect(visiblePaths(context("USER", ["VIEW_DASHBOARD", "ADD_SALES"]))).toEqual(["/", "/sales"]);
  });

  it("keeps Settings for the owner role only", () => {
    expect(visiblePaths(context("OWNER", []))).toEqual(["/settings"]);
    expect(visiblePaths(context("MANAGER", ["MANAGE_TEAM"]))).toEqual(["/team"]);
  });
});
