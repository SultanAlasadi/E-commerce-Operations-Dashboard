import { describe, expect, it } from "vitest";
import { entryOutcome } from "./entry-errors";

const input = { platformId: "p-1", businessDate: "2026-10-13" };

describe("entryOutcome", () => {
  it("switches a duplicate to the correction screen for that record", () => {
    expect(
      entryOutcome(
        { error: "DUPLICATE", message: "Exists", details: { existingId: "r" } },
        input,
        true,
      ),
    ).toEqual({ type: "open-existing", href: "/sales/p-1/2026-10-13?from=duplicate" });
  });

  it("explains a duplicate to entry-only members, who cannot open records", () => {
    const outcome = entryOutcome({ error: "DUPLICATE", message: "Exists" }, input, false);
    expect(outcome).toMatchObject({
      type: "errors",
      fieldErrors: { businessDate: expect.any(String) },
    });
  });

  it.each([
    ["FUTURE_DATE", "businessDate"],
    ["BEFORE_TRACKING_START", "businessDate"],
    ["PLATFORM_ARCHIVED", "platformId"],
    ["PLATFORM_NOT_FOUND", "platformId"],
  ])("puts %s on the %s field", (error, field) => {
    expect(entryOutcome({ error, message: "Message" }, input, true)).toEqual({
      type: "errors",
      fieldErrors: { [field]: "Message" },
    });
  });

  it("maps schema errors, including a positive amount with zero orders, to fields", () => {
    expect(
      entryOutcome(
        {
          error: "INVALID",
          message: "Check the highlighted fields.",
          details: { fieldErrors: { orders: "A positive amount needs at least one order." } },
        },
        input,
        true,
      ),
    ).toEqual({
      type: "errors",
      fieldErrors: { orders: "A positive amount needs at least one order." },
      formError: "Check the highlighted fields.",
    });
  });

  it("shows authorization failures as a form message", () => {
    expect(entryOutcome({ error: "FORBIDDEN", message: "No permission" }, input, true)).toEqual({
      type: "errors",
      fieldErrors: {},
      formError: "No permission",
    });
  });
});
