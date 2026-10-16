import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorize, createPlatform, updatePlatform, setPlatformArchived, revalidatePath } =
  vi.hoisted(() => ({
    authorize: vi.fn(),
    createPlatform: vi.fn(),
    updatePlatform: vi.fn(),
    setPlatformArchived: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("@/lib/auth/membership", () => ({ authorize }));
vi.mock("@/lib/server/platforms", () => ({ createPlatform, updatePlatform, setPlatformArchived }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { addPlatform, archivePlatform } = await import("./actions");
const input = { name: "Store", provider: "Shopify", trackingStartDate: "2026-01-01" };

beforeEach(() => vi.clearAllMocks());

describe("platform actions", () => {
  it("denies a member without MANAGE_PLATFORMS", async () => {
    authorize.mockResolvedValue({ ok: false, error: "FORBIDDEN", message: "Forbidden" });

    expect(await addPlatform(input)).toMatchObject({ ok: false, error: "FORBIDDEN" });
    expect(await archivePlatform("platform-1")).toMatchObject({ ok: false, error: "FORBIDDEN" });
    expect(createPlatform).not.toHaveBeenCalled();
    expect(setPlatformArchived).not.toHaveBeenCalled();
  });

  it("returns a duplicate name error and does not revalidate", async () => {
    authorize.mockResolvedValue({
      ok: true,
      value: { member: { id: "member-1" }, workspace: { id: "ws-1" } },
    });
    createPlatform.mockResolvedValue({
      ok: false,
      error: "NAME_TAKEN",
      message: "Another platform already uses this name.",
    });

    expect(await addPlatform(input)).toMatchObject({ ok: false, error: "NAME_TAKEN" });
    expect(createPlatform).toHaveBeenCalledWith(
      { workspaceId: "ws-1", actorId: "member-1" },
      input,
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
