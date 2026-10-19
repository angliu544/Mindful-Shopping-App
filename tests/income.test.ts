import { describe, expect, it } from "vitest";
import { formatWorkTime, hourlyRateOf, workHoursFor } from "@/lib/income";
import { formatPrice } from "@/lib/format";

const hourly = { incomeType: "hourly" as const, incomeAmount: 25, hoursPerWeek: null };
const salary = { incomeType: "salary" as const, incomeAmount: 60000, hoursPerWeek: 40 };

const workTime = (price: number, settings: typeof hourly | typeof salary) =>
  formatWorkTime(workHoursFor(price, settings)!, settings.hoursPerWeek);

describe("work time", () => {
  it("converts a salary to an hourly rate", () => {
    expect(hourlyRateOf(salary)).toBeCloseTo(28.846, 3);
  });

  it.each([
    [0.2, "less than a minute"],
    [12, "29 min"],
    [100, "4 h"],
    [129.99, "5 h 12 min"],
    [300, "12 hours"],
    [1000, "40 hours"],
  ])("hourly: $%d -> %s (no workdays)", (price, expected) => {
    expect(workTime(price, hourly)).toBe(expected);
  });

  it.each([
    [89, "3 h 5 min"],
    [1000, "35 hours (4.3 workdays)"],
  ])("salary: $%d -> %s", (price, expected) => {
    expect(workTime(price, salary)).toBe(expected);
  });

  it("is null without settings or for a free item", () => {
    expect(workHoursFor(50, null)).toBeNull();
    expect(workHoursFor(0, hourly)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats USD", () => {
    expect(formatPrice(1299.5)).toBe("$1,299.50");
    expect(formatPrice(0)).toBe("$0.00");
  });
});
