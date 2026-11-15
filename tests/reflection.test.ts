import { describe, expect, it } from "vitest";
import { reflectionQuestions, reflectionVerdict, type ReflectionQuestion } from "@/lib/reflection";
import type { ItemDTO } from "@/types/item";

const item: ItemDTO = {
  id: "1",
  name: "Wool scarf",
  price: 64,
  currency: "USD",
  imageUrl: "https://res.cloudinary.com/x.png",
  description: null,
  availableAt: "2026-11-01T00:00:00Z",
  status: "pending",
  decision: null,
  decidedAt: null,
  createdAt: "2026-10-31T00:00:00Z",
};

/** Picks the answer at `index` (0 = most positive, 2 = most negative) for every question. */
const answerAll = (qs: ReflectionQuestion[], index: number) => qs.map((q) => q.answers[index]);
const pick = (qs: ReflectionQuestion[], picks: Record<string, number>) => qs.map((q) => q.answers[picks[q.id] ?? 0]);

describe("reflection questions", () => {
  it("asks six questions with three answers each, mentioning the item and price", () => {
    const qs = reflectionQuestions(item, null);
    expect(qs).toHaveLength(6);
    expect(qs.every((q) => q.answers.length === 3)).toBe(true);
    expect(qs[0].prompt).toContain("Wool scarf");
    expect(qs.find((q) => q.id === "afford")!.prompt).toContain("$64.00");
  });

  it("asks about work hours when an income is set, otherwise about a month from now", () => {
    const withIncome = reflectionQuestions(item, { incomeType: "hourly", incomeAmount: 16, hoursPerWeek: null });
    expect(withIncome.find((q) => q.id === "worth")!.prompt).toContain("about 4 h of work");
    expect(reflectionQuestions(item, null).some((q) => q.id === "month")).toBe(true);
  });
});

describe("reflection verdict", () => {
  const qs = reflectionQuestions(item, null);

  it("all the best answers -> a thoughtful buy, with reasons", () => {
    const result = reflectionVerdict(item, answerAll(qs, 0));
    expect(result.verdict).toBe("buy");
    expect(result.title).toBe("Looks like a thoughtful buy");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("all the worst answers -> let it go", () => {
    expect(reflectionVerdict(item, answerAll(qs, 2)).verdict).toBe("skip");
  });

  it("not being able to afford it ends with 'let it go' however good the rest is", () => {
    const answers = pick(qs, { afford: 2 }).slice(0, 4); // stops at the deal-breaker
    const result = reflectionVerdict(item, answers);
    expect(result.verdict).toBe("skip");
    expect(result.reasons[0]).toBe("You can't comfortably afford it right now");
  });

  it("good reasons with a doubt -> a close call that suggests more time", () => {
    const result = reflectionVerdict(item, pick(qs, { mood: 1 }));
    expect(result.verdict).toBe("wait");
    expect(result.reasons[0]).toBe("A sale or ad may be doing the talking");
  });

  it("weighs mixed answers: a tight budget tips 'want it' into let it go; an owned duplicate makes it a close call", () => {
    expect(reflectionVerdict(item, answerAll(qs, 1)).verdict).toBe("skip");
    expect(reflectionVerdict(item, pick(qs, { need: 1, use: 1, own: 0, afford: 0, month: 0, mood: 0 })).verdict).toBe("buy");
    expect(reflectionVerdict(item, pick(qs, { need: 1, use: 1, own: 2, afford: 0, month: 0, mood: 0 })).verdict).toBe("wait");
  });
});
