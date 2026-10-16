import { describe, expect, it } from "vitest";
import { dailySalesCorrectionSchema, dailySalesInputSchema } from "./sales";

const base = {
  platformId: "0199f000-0000-7000-8000-000000000002",
  businessDate: "2026-10-13",
  orders: 42,
  amount: "4860.00",
};

const valid = (input: object) => dailySalesInputSchema.safeParse({ ...base, ...input }).success;

describe("dailySalesInputSchema", () => {
  it("accepts a normal day", () => expect(valid({})).toBe(true));
  it("accepts an explicit zero day", () => expect(valid({ orders: 0, amount: "0" })).toBe(true));
  it("rejects fractional orders", () => expect(valid({ orders: 2.5 })).toBe(false));
  it("rejects negative orders", () => expect(valid({ orders: -1 })).toBe(false));
  it("rejects negative amounts", () => expect(valid({ amount: "-1.00" })).toBe(false));
  it("rejects more than 2 decimals", () => expect(valid({ amount: "10.123" })).toBe(false));
  it("rejects a positive amount with zero orders", () => {
    const result = dailySalesInputSchema.safeParse({ ...base, orders: 0, amount: "10.00" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["orders"]);
  });
  it("rejects impossible dates", () => expect(valid({ businessDate: "2026-02-30" })).toBe(false));
  it("rejects amounts beyond Decimal(14,2)", () =>
    expect(valid({ amount: "1234567890123" })).toBe(false));
});

describe("dailySalesCorrectionSchema", () => {
  it("applies the same figure rules", () => {
    expect(dailySalesCorrectionSchema.safeParse({ orders: 0, amount: "5" }).success).toBe(false);
    expect(
      dailySalesCorrectionSchema.safeParse({ orders: 44, amount: "5120.00", reason: "Late close" })
        .success,
    ).toBe(true);
  });
});
