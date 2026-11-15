import { describe, expect, it } from "vitest";
import { decisionYear, statsFor, yearsWithDecisions } from "@/lib/history";
import type { ItemDTO } from "@/types/item";

let n = 0;
const item = (decision: "buy" | "skip", price: number, decidedAt: string): ItemDTO => ({
  id: String(++n),
  name: `Item ${n}`,
  price,
  currency: "USD",
  imageUrl: "https://res.cloudinary.com/x.png",
  description: null,
  availableAt: decidedAt,
  status: "reviewed",
  decision,
  decidedAt,
  createdAt: decidedAt,
});

const items = [
  item("skip", 100, "2026-06-01T12:00:00Z"),
  item("buy", 40, "2026-03-01T12:00:00Z"),
  item("skip", 25.5, "2025-07-04T12:00:00Z"),
  // 2026-01-01 05:00 UTC is still 31 Dec 2025 in Los Angeles.
  item("skip", 10, "2026-01-01T05:00:00Z"),
];

describe("history stats by period", () => {
  it("totals one year", () => {
    expect(statsFor(items, 2026, "UTC")).toEqual({ reviewed: 3, bought: 1, skipped: 2, moneySaved: 110, moneySpent: 40 });
    expect(statsFor(items, 2025, "UTC")).toEqual({ reviewed: 1, bought: 0, skipped: 1, moneySaved: 25.5, moneySpent: 0 });
  });

  it("totals all time", () => {
    expect(statsFor(items, "all", "UTC")).toEqual({ reviewed: 4, bought: 1, skipped: 3, moneySaved: 135.5, moneySpent: 40 });
  });

  it("is zero for a year with no decisions", () => {
    expect(statsFor(items, 2020, "UTC").reviewed).toBe(0);
  });

  it("assigns a decision to the year in the viewer's time zone", () => {
    const newYearsEve = items[3];
    expect(decisionYear(newYearsEve, "UTC")).toBe(2026);
    expect(decisionYear(newYearsEve, "America/Los_Angeles")).toBe(2025);
    expect(statsFor(items, 2025, "America/Los_Angeles").moneySaved).toBe(35.5);
  });

  it("lists years newest first and always includes the current year", () => {
    expect(yearsWithDecisions(items, 2027, "UTC")).toEqual([2027, 2026, 2025]);
    expect(yearsWithDecisions([], 2026, "UTC")).toEqual([2026]);
  });

  it("rounds money to cents", () => {
    const cents = [item("skip", 0.1, "2026-01-02T00:00:00Z"), item("skip", 0.2, "2026-01-02T00:00:00Z")];
    expect(statsFor(cents, 2026, "UTC").moneySaved).toBe(0.3);
  });
});
