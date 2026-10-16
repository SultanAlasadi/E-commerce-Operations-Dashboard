import { describe, expect, it } from "vitest";
import {
  addDays,
  fromDbDate,
  isBusinessDate,
  isValidTimeZone,
  toDbDate,
  todayInTimeZone,
} from "./dates";

describe("todayInTimeZone", () => {
  // 2026-10-14 03:30 UTC is still 13 Oct in New York (UTC-4) but 14 Oct in Riyadh (UTC+3).
  const instant = new Date("2026-10-14T03:30:00.000Z");

  it("uses the workspace zone, not UTC or the server's zone", () => {
    expect(todayInTimeZone("America/New_York", instant)).toBe("2026-10-13");
    expect(todayInTimeZone("Asia/Riyadh", instant)).toBe("2026-10-14");
  });

  it("switches day exactly at local midnight", () => {
    expect(todayInTimeZone("America/New_York", new Date("2026-10-14T03:59:59.999Z"))).toBe(
      "2026-10-13",
    );
    expect(todayInTimeZone("America/New_York", new Date("2026-10-14T04:00:00.000Z"))).toBe(
      "2026-10-14",
    );
  });
});

describe("business date helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isBusinessDate("2026-10-13")).toBe(true);
    expect(isBusinessDate("2026-02-30")).toBe(false);
    expect(isBusinessDate("2026-1-3")).toBe(false);
  });

  it("round-trips through the DB representation", () => {
    expect(fromDbDate(toDbDate("2026-10-13"))).toBe("2026-10-13");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("recognises IANA time zones", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
