import type { HistoryStats } from "@/types/api";
import type { ItemDTO } from "@/types/item";

export type Period = "all" | number;

const roundCents = (n: number) => Math.round(n * 100) / 100;

/** Year of a decision in the given time zone ("UTC" on the server, the viewer's zone in the browser). */
export function decisionYear(item: ItemDTO, timeZone?: string): number | null {
  if (!item.decidedAt) return null;
  return Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(new Date(item.decidedAt)));
}

/** Years that have at least one decision, newest first, always including `currentYear`. */
export function yearsWithDecisions(items: ItemDTO[], currentYear: number, timeZone?: string): number[] {
  const years = new Set<number>([currentYear]);
  for (const item of items) {
    const year = decisionYear(item, timeZone);
    if (year !== null) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

/** Totals for one year (in `timeZone`) or for everything. */
export function statsFor(items: ItemDTO[], period: Period, timeZone?: string): HistoryStats {
  let bought = 0;
  let skipped = 0;
  let moneySaved = 0;
  let moneySpent = 0;
  for (const item of items) {
    if (period !== "all" && decisionYear(item, timeZone) !== period) continue;
    if (item.decision === "buy") {
      bought += 1;
      moneySpent += item.price;
    } else if (item.decision === "skip") {
      skipped += 1;
      moneySaved += item.price;
    }
  }
  return { reviewed: bought + skipped, bought, skipped, moneySaved: roundCents(moneySaved), moneySpent: roundCents(moneySpent) };
}
