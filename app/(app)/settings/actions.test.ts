import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorize, updateWorkspaceSettings, revalidatePath } = vi.hoisted(() => ({
  authorize: vi.fn(),
  updateWorkspaceSettings: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/membership", () => ({ authorize }));
vi.mock("@/lib/server/workspace", () => ({ updateWorkspaceSettings }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { saveWorkspaceSettings } = await import("./actions");
const input = { name: "Opera", currency: "SAR", timeZone: "Asia/Riyadh" };

beforeEach(() => vi.clearAllMocks());

describe("saveWorkspaceSettings", () => {
  it("lets an owner save workspace settings", async () => {
    authorize.mockResolvedValue({
      ok: true,
      value: { member: { role: "OWNER" }, workspace: { id: "ws-1" } },
    });
    updateWorkspaceSettings.mockResolvedValue({ ok: true, value: { id: "ws-1" } });

    expect(await saveWorkspaceSettings(input)).toEqual({ ok: true, value: { id: "ws-1" } });
    expect(authorize).toHaveBeenCalledWith("MANAGE_PLATFORMS");
    expect(updateWorkspaceSettings).toHaveBeenCalledWith("ws-1", input);
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("rejects a manager even if they can manage platforms", async () => {
    authorize.mockResolvedValue({
      ok: true,
      value: { member: { role: "MANAGER" }, workspace: { id: "ws-1" } },
    });

    expect(await saveWorkspaceSettings(input)).toMatchObject({ ok: false, error: "FORBIDDEN" });
    expect(updateWorkspaceSettings).not.toHaveBeenCalled();
  });
});
