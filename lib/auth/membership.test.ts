import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Member, Permission, Workspace } from "@/generated/prisma/client";
import type { MemberContext } from "@/lib/server/membership";

const { auth, getActiveMembership, redirect } = vi.hoisted(() => ({
  auth: vi.fn(),
  getActiveMembership: vi.fn(),
  // Like Next's redirect(), this throws so the caller stops.
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/server/membership", () => ({ getActiveMembership }));

const { authorize, can, requireMember, requirePermission } = await import("./membership");

function context(permissions: Permission[]): MemberContext {
  return {
    member: { id: "member-1", clerkUserId: "user_1", removedAt: null } as Member,
    workspace: { id: "workspace-1", name: "Opera" } as Workspace,
    permissions: new Set(permissions),
  };
}

function signedIn(userId: string | null) {
  auth.mockResolvedValue({
    userId,
    redirectToSignIn: () => {
      throw new Error("REDIRECT /sign-in");
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("can", () => {
  it("reads the member's permission set", () => {
    const ctx = context(["VIEW_DASHBOARD"]);
    expect(can(ctx, "VIEW_DASHBOARD")).toBe(true);
    expect(can(ctx, "VIEW_SALES")).toBe(false);
  });
});

describe("authorize", () => {
  it("returns UNAUTHENTICATED when not signed in, without touching the database", async () => {
    signedIn(null);
    expect(await authorize("VIEW_SALES")).toMatchObject({ ok: false, error: "UNAUTHENTICATED" });
    expect(getActiveMembership).not.toHaveBeenCalled();
  });

  it("returns NO_ACCESS when the user has no active membership", async () => {
    signedIn("user_1");
    getActiveMembership.mockResolvedValue(null);
    expect(await authorize("VIEW_SALES")).toMatchObject({ ok: false, error: "NO_ACCESS" });
    expect(getActiveMembership).toHaveBeenCalledWith("user_1");
  });

  it("returns FORBIDDEN when the permission is missing", async () => {
    signedIn("user_1");
    getActiveMembership.mockResolvedValue(context(["VIEW_DASHBOARD"]));
    expect(await authorize("EDIT_SALES")).toMatchObject({ ok: false, error: "FORBIDDEN" });
  });

  it("returns the member context when the permission is held", async () => {
    signedIn("user_1");
    const ctx = context(["VIEW_DASHBOARD", "VIEW_SALES"]);
    getActiveMembership.mockResolvedValue(ctx);
    expect(await authorize("VIEW_SALES")).toEqual({ ok: true, value: ctx });
  });

  it("never redirects", async () => {
    signedIn(null);
    await authorize("VIEW_SALES");
    signedIn("user_1");
    getActiveMembership.mockResolvedValue(null);
    await authorize("VIEW_SALES");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("requireMember and requirePermission", () => {
  it("send a signed-out user to sign-in", async () => {
    signedIn(null);
    await expect(requireMember()).rejects.toThrow("REDIRECT /sign-in");
  });

  it("send a user without membership to /no-access", async () => {
    signedIn("user_1");
    getActiveMembership.mockResolvedValue(null);
    await expect(requireMember()).rejects.toThrow("REDIRECT /no-access");
  });

  it("send a member without the permission to /no-access", async () => {
    signedIn("user_1");
    getActiveMembership.mockResolvedValue(context(["VIEW_DASHBOARD"]));
    await expect(requirePermission("MANAGE_TEAM")).rejects.toThrow("REDIRECT /no-access");
  });

  it("return the context when the member holds the permission", async () => {
    signedIn("user_1");
    const ctx = context(["MANAGE_TEAM"]);
    getActiveMembership.mockResolvedValue(ctx);
    expect(await requirePermission("MANAGE_TEAM")).toBe(ctx);
  });
});
