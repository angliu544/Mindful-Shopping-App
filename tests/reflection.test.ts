import { describe, expect, it } from "vitest";
import { REFLECTION_QUESTIONS, reflectionBand, resolveReflection } from "@/lib/reflection";
import { decisionBodySchema } from "@/lib/validations";

const answers = (overrides: Record<string, string> = {}) => ({
  "own-similar": "no",
  necessary: "need",
  frequency: "daily",
  budget: "yes",
  reason: "need",
  ...overrides,
});

describe("reflection questions", () => {
  it("match the agreed wording and scores", () => {
    const table = REFLECTION_QUESTIONS.map((q) => [q.prompt, q.answers.map((a) => [a.label, a.score])]);
    expect(table).toEqual([
      ["Do you already own something similar?", [["Yes", -2], ["No", 1], ["I am not sure", -1]]],
      ["Is this item necessary right now?", [["Yes, I need it", 2], ["It would be useful", 1], ["No, I mostly want it", -2]]],
      [
        "How often do you expect to use it?",
        [["Every day", 2], ["A few times a week", 1], ["Occasionally", 0], ["Rarely", -2], ["I am not sure", -1]],
      ],
      [
        "Does this purchase fit within your budget?",
        [["Yes", 2], ["It would make my budget tighter", -1], ["No", -3], ["I am not sure", -1]],
      ],
      [
        "What is the main reason you want this item?",
        [
          ["I need it", 2],
          ["It will replace something I own", 1],
          ["It will make my life easier", 1],
          ["I like how it looks", 0],
          ["I saw it recommended or advertised", -1],
          ["I am not sure", -1],
        ],
      ],
    ]);
  });
});

describe("scoring", () => {
  it("adds up the selected answers and stores their text", () => {
    const result = resolveReflection(answers({ budget: "tighter", reason: "looks" }));
    expect(result!.score).toBe(1 + 2 + 2 - 1 + 0);
    expect(result!.responses[3]).toEqual({
      question: "Does this purchase fit within your budget?",
      answer: "It would make my budget tighter",
      score: -1,
    });
  });

  it.each([
    [9, "Clear need"],
    [4, "Clear need"],
    [3, "Worth more thought"],
    [0, "Worth more thought"],
    [-1, "Possible impulse"],
    [-10, "Possible impulse"],
  ])("score %d reads as %s", (score, label) => {
    expect(reflectionBand(score).label).toBe(label);
  });

  it("uses the agreed summary text", () => {
    expect(reflectionBand(4).summary).toBe("This purchase seems connected to a clear need or frequent use.");
    expect(reflectionBand(0).summary).toBe(
      "This item may be useful, but it may be worth thinking about it a little longer.",
    );
    expect(reflectionBand(-1).summary).toBe(
      "This may be an impulse purchase. Consider waiting or looking for something you already own that could serve the same purpose.",
    );
  });

  const withoutReason = Object.fromEntries(Object.entries(answers()).filter(([key]) => key !== "reason"));

  it.each([
    ["a missing answer", withoutReason],
    ["an unknown answer id", answers({ budget: "maybe" })],
    ["an extra question", { ...answers(), bonus: "yes" }],
    // Five own keys, but "reason" only comes from the prototype.
    ["an inherited answer", Object.assign(Object.create({ reason: "need" }), withoutReason, { bonus: "yes" })],
  ])("rejects %s", (_label, input) => {
    expect(resolveReflection(input)).toBeNull();
  });
});

describe("decision body", () => {
  it("resolves reflection answers on the server and ignores client scores", () => {
    const parsed = decisionBodySchema.parse({
      decision: "buy",
      reflection: { answers: answers({ budget: "no" }), score: 99 },
      reflectionScore: 99,
    });
    expect(parsed.reflection!.score).toBe(1 + 2 + 2 - 3 + 2);
    expect(parsed).not.toHaveProperty("reflectionScore");
  });

  it("accepts a decision without a reflection", () => {
    expect(decisionBodySchema.parse({ decision: "skip" })).toEqual({ decision: "skip" });
  });

  it("rejects an incomplete reflection with a friendly message", () => {
    const result = decisionBodySchema.safeParse({ decision: "buy", reflection: { answers: { budget: "yes" } } });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toBe("Please answer each reflection question once.");
  });
});
