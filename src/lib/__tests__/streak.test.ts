import { describe, expect, it } from "vitest";

import { addDays, monthEnd, monthStart, toDateKey } from "@/lib/date";
import { computeLastNDays, computeMonthCompletionRate, computeStreak } from "@/lib/streak";

describe("date utils", () => {
  it("monthStart/monthEnd", () => {
    expect(monthStart("2026-03")).toBe("2026-03-01");
    expect(monthEnd("2026-03")).toBe("2026-03-31");
  });

  it("addDays", () => {
    expect(addDays("2026-03-01", 1)).toBe("2026-03-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("toDateKey returns YYYY-MM-DD", () => {
    const key = toDateKey(new Date("2026-03-20T12:00:00Z"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("streak utils", () => {
  it("computeStreak - habit single", () => {
    const completed = new Set(["2026-03-20", "2026-03-19", "2026-03-18"]);
    const streak = computeStreak("2026-03-20", (dk) => completed.has(dk));
    expect(streak).toBe(3);
  });

  it("computeMonthCompletionRate", () => {
    const completed = new Set(["2026-03-01", "2026-03-02"]);
    const result = computeMonthCompletionRate({
      monthKey: "2026-03",
      isComplete: (dk) => completed.has(dk),
    });

    expect(result.totalDays).toBe(31);
    expect(result.completedDays).toBe(2);
    expect(result.rate).toBeCloseTo(2 / 31);
  });

  it("computeLastNDays", () => {
    const last = computeLastNDays({ endDateKey: "2026-03-20", n: 3 });
    expect(last).toEqual(["2026-03-18", "2026-03-19", "2026-03-20"]);
  });
});

