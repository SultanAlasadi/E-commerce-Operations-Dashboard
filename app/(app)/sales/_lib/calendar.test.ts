import { describe, expect, it } from "vitest";
import { calendarMonth, dayState, rangeDays } from "./calendar";

const today = "2026-10-13";
const shop = { id: "shop", trackingStartDate: "2026-10-05", archivedOn: null };
const amazon = { id: "amazon", trackingStartDate: "2026-10-01", archivedOn: "2026-10-10" };
const rec = (platformId: string, businessDate: string, orders: number, amount: string) => ({
  platformId,
  businessDate,
  orders,
  amount,
});

describe("dayState", () => {
  it("tells a missing day apart from a recorded zero", () => {
    expect(dayState("2026-10-06", [shop], [], today).state).toBe("missing");
    expect(
      dayState("2026-10-06", [shop], [rec("shop", "2026-10-06", 0, "0.00")], today).state,
    ).toBe("zero");
    expect(
      dayState("2026-10-06", [shop], [rec("shop", "2026-10-06", 3, "0.00")], today).state,
    ).toBe("recorded");
  });

  it("expects nothing before tracking start, and nothing from the archive day on", () => {
    expect(dayState("2026-10-04", [shop], [], today).state).toBe("untracked");
    expect(dayState("2026-10-09", [amazon], [], today).state).toBe("missing");
    expect(dayState("2026-10-10", [amazon], [], today).state).toBe("untracked");
  });

  it("does not count today as missing until it has ended", () => {
    expect(dayState(today, [shop], [], today)).toMatchObject({ state: "open", missing: 0 });
    expect(dayState("2026-10-14", [shop], [], today).state).toBe("future");
  });

  it("marks a day partial when only some expected platforms recorded it", () => {
    const day = dayState("2026-10-06", [shop, amazon], [rec("shop", "2026-10-06", 1, "5")], today);
    expect(day).toMatchObject({ state: "partial", recorded: 1, expected: 2, missing: 1 });
  });
});

describe("rangeDays and calendarMonth", () => {
  it("counts missing platform-days over a range", () => {
    const days = rangeDays("2026-10-01", "2026-10-12", [shop, amazon], [], today);
    // amazon: 1–9 Oct (9 days); shop: 5–12 Oct (8 days).
    expect(days.reduce((sum, day) => sum + day.missing, 0)).toBe(17);
  });

  it("lays out a Monday-first month", () => {
    const month = calendarMonth("2026-10-20", [shop], [], today);
    expect(month.leadingBlanks).toBe(3); // 1 Oct 2026 is a Thursday.
    expect(month.days).toHaveLength(31);
    expect(month.days[0].date).toBe("2026-10-01");
  });
});
