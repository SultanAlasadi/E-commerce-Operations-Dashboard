import { describe, expect, it } from "vitest";
import { addMonths, endOfMonth, resolvePeriod, shiftAnchor } from "./periods";

const today = "2026-10-13";

describe("resolvePeriod", () => {
  it("defaults to the current month", () => {
    expect(resolvePeriod({}, today)).toMatchObject({
      period: "month",
      from: "2026-10-01",
      to: "2026-10-31",
      label: "October 2026",
    });
  });

  it("starts weeks on Monday", () => {
    // 13 Oct 2026 is a Tuesday.
    expect(resolvePeriod({ period: "week", date: today }, today)).toMatchObject({
      from: "2026-10-12",
      to: "2026-10-18",
    });
    // A Sunday belongs to the week that started the Monday before.
    expect(resolvePeriod({ period: "week", date: "2026-10-18" }, today)).toMatchObject({
      from: "2026-10-12",
    });
  });

  it("keeps custom ranges inclusive and rejects reversed or invalid ones", () => {
    expect(
      resolvePeriod({ period: "custom", from: "2026-10-01", to: "2026-10-05" }, today),
    ).toMatchObject({ from: "2026-10-01", to: "2026-10-05" });
    expect(
      resolvePeriod({ period: "custom", from: "2026-10-05", to: "2026-10-01" }, today),
    ).toMatchObject({ from: "2026-09-14", to: today });
    expect(resolvePeriod({ period: "custom", from: "2026-02-30", to: today }, today)).toMatchObject(
      {
        to: today,
      },
    );
  });

  it("ignores unknown periods and dates", () => {
    expect(resolvePeriod({ period: "decade", date: "nope" }, today)).toMatchObject({
      period: "month",
      anchor: today,
    });
  });
});

describe("month arithmetic", () => {
  it("clamps to the end of shorter months and handles leap years", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
  });

  it("moves the anchor by one period", () => {
    expect(shiftAnchor("week", today, -1)).toBe("2026-10-06");
    expect(shiftAnchor("year", "2028-02-29", 1)).toBe("2029-02-28");
  });
});
