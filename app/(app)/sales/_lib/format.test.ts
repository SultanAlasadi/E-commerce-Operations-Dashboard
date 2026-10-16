import { describe, expect, it } from "vitest";
import { formatMoment, formatMoney, isRecordedZero, sumAmounts } from "./format";

const plain = (value: string) => value.replace(/\s/g, " ");

describe("sumAmounts", () => {
  it("adds decimal strings exactly", () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004.
    expect(sumAmounts(["0.10", "0.20"])).toBe("0.30");
    expect(sumAmounts(["999999999999.99", "0.01"])).toBe("1000000000000.00");
    expect(sumAmounts(["4860", "4210.5", "0"])).toBe("9070.50");
    expect(sumAmounts([])).toBe("0.00");
  });

  it("rejects values that are not amounts", () => {
    expect(() => sumAmounts(["-1"])).toThrow();
  });
});

describe("formatMoney", () => {
  it("formats the decimal string with the workspace currency", () => {
    expect(plain(formatMoney("4860.00", "SAR"))).toBe("SAR 4,860.00");
    expect(plain(formatMoney("4860.00", "SAR", { trimZeroCents: true }))).toBe("SAR 4,860");
    expect(plain(formatMoney("4860.50", "SAR", { trimZeroCents: true }))).toBe("SAR 4,860.50");
    // Beyond float precision, the string keeps every digit.
    expect(plain(formatMoney("999999999999.99", "USD"))).toBe("USD 999,999,999,999.99");
  });
});

describe("isRecordedZero", () => {
  it("is only an explicit 0 orders / 0 amount", () => {
    expect(isRecordedZero({ orders: 0, amount: "0.00" })).toBe(true);
    expect(isRecordedZero({ orders: 2, amount: "0.00" })).toBe(false);
  });
});

describe("formatMoment", () => {
  it("shows the moment in the workspace time zone", () => {
    expect(plain(formatMoment(new Date("2026-10-13T13:18:00Z"), "America/New_York"))).toBe(
      "13 Oct 2026 · 09:18 EDT",
    );
    expect(plain(formatMoment(new Date("2026-10-13T06:18:00Z"), "Asia/Riyadh"))).toBe(
      "13 Oct 2026 · 09:18 GMT+3",
    );
  });
});
