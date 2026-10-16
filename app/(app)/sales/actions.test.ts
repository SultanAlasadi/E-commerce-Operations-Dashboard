import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorize, createDailySales, correctDailySales, deleteDailySales, revalidatePath } =
  vi.hoisted(() => ({
    authorize: vi.fn(),
    createDailySales: vi.fn(),
    correctDailySales: vi.fn(),
    deleteDailySales: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("@/lib/auth/membership", () => ({ authorize }));
vi.mock("@/lib/server/sales", () => ({ createDailySales, correctDailySales, deleteDailySales }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { addDailySales, correctSales, deleteSales } = await import("./actions");

const PLATFORM = "0199e000-0000-7000-8000-000000000001";
const RECORD = "0199e000-0000-7000-8000-000000000002";
const VERSION = "2026-10-13T06:18:00.000Z";
const input = { platformId: PLATFORM, businessDate: "2026-10-13", orders: 42, amount: "4860.00" };
const correction = { orders: 44, amount: "5120.00", reason: "Late close" };

function allow() {
  authorize.mockResolvedValue({
    ok: true,
    value: { member: { id: "member-1" }, workspace: { id: "ws-1" } },
  });
}

function deny(error: "UNAUTHENTICATED" | "NO_ACCESS" | "FORBIDDEN") {
  authorize.mockResolvedValue({ ok: false, error, message: error });
}

beforeEach(() => vi.clearAllMocks());

describe("permission checks", () => {
  it.each(["UNAUTHENTICATED", "NO_ACCESS", "FORBIDDEN"] as const)(
    "add, correct and delete stop at %s without calling a service",
    async (error) => {
      deny(error);
      expect(await addDailySales(input)).toMatchObject({ ok: false, error });
      expect(await correctSales(RECORD, correction, VERSION)).toMatchObject({ ok: false, error });
      expect(await deleteSales(RECORD, VERSION)).toMatchObject({ ok: false, error });
      expect(createDailySales).not.toHaveBeenCalled();
      expect(correctDailySales).not.toHaveBeenCalled();
      expect(deleteDailySales).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("asks for the matching permission for each action", async () => {
    deny("FORBIDDEN");
    await addDailySales(input);
    await correctSales(RECORD, correction, VERSION);
    await deleteSales(RECORD, VERSION);
    expect(authorize.mock.calls.map(([permission]) => permission)).toEqual([
      "ADD_SALES",
      "EDIT_SALES",
      "DELETE_SALES",
    ]);
  });
});

describe("addDailySales", () => {
  it("creates as the signed-in member in their workspace", async () => {
    allow();
    createDailySales.mockResolvedValue({ ok: true, value: { id: RECORD } });
    expect(await addDailySales(input)).toMatchObject({ ok: true });
    expect(createDailySales).toHaveBeenCalledWith(
      { workspaceId: "ws-1", actorId: "member-1" },
      input,
    );
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("rejects input that fails the form schema before reaching the service", async () => {
    allow();
    const result = await addDailySales({ ...input, orders: 0, amount: "10.00" });
    expect(result).toMatchObject({
      ok: false,
      error: "INVALID",
      details: { fieldErrors: { orders: "A positive amount needs at least one order." } },
    });
    expect(createDailySales).not.toHaveBeenCalled();
  });

  it("passes a duplicate through so the form can open the existing record", async () => {
    allow();
    createDailySales.mockResolvedValue({
      ok: false,
      error: "DUPLICATE",
      message: "An entry already exists for this platform and date.",
      details: { existingId: RECORD },
    });
    expect(await addDailySales(input)).toMatchObject({ ok: false, error: "DUPLICATE" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("correctSales", () => {
  it("sends the version the user edited, and returns STALE when it changed", async () => {
    allow();
    correctDailySales.mockResolvedValue({
      ok: false,
      error: "STALE",
      message: "Someone else changed this record. Reload it and try again.",
    });
    expect(await correctSales(RECORD, correction, VERSION)).toMatchObject({
      ok: false,
      error: "STALE",
    });
    expect(correctDailySales).toHaveBeenCalledWith(
      { workspaceId: "ws-1", actorId: "member-1" },
      RECORD,
      correction,
      { expectedUpdatedAt: new Date(VERSION) },
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("treats a malformed record id or version as not found", async () => {
    allow();
    expect(await correctSales("not-a-uuid", correction, VERSION)).toMatchObject({
      error: "NOT_FOUND",
    });
    expect(await correctSales(RECORD, correction, "yesterday-ish")).toMatchObject({
      error: "NOT_FOUND",
    });
    expect(correctDailySales).not.toHaveBeenCalled();
  });
});

describe("deleteSales", () => {
  it("deletes only the version the user confirmed", async () => {
    allow();
    deleteDailySales.mockResolvedValue({ ok: true, value: { id: RECORD } });
    expect(await deleteSales(RECORD, VERSION)).toMatchObject({ ok: true });
    expect(deleteDailySales).toHaveBeenCalledWith(
      { workspaceId: "ws-1", actorId: "member-1" },
      RECORD,
      { expectedUpdatedAt: new Date(VERSION) },
    );
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("returns STALE when the record changed after it was shown", async () => {
    allow();
    deleteDailySales.mockResolvedValue({ ok: false, error: "STALE", message: "Changed." });
    expect(await deleteSales(RECORD, VERSION)).toMatchObject({ ok: false, error: "STALE" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
