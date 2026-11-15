import { formatPrice } from "@/lib/format";
import { formatWorkTime, workHoursFor } from "@/lib/income";
import type { ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

/**
 * The reflection chat shown before a "Buy": a fixed set of questions with
 * scored answers. Pure logic, so it runs instantly and nothing leaves the app.
 */

export interface ReflectionAnswer {
  label: string;
  /** Positive leans "buy", negative leans "let it go". */
  score: number;
  /** Shown in the verdict when this answer was picked. */
  note?: string;
  /** Ends the reflection with "let it go" whatever else was said. */
  dealBreaker?: boolean;
}

export interface ReflectionQuestion {
  id: string;
  prompt: string;
  answers: ReflectionAnswer[];
}

export type Verdict = "buy" | "wait" | "skip";

export interface ReflectionResult {
  verdict: Verdict;
  title: string;
  message: string;
  /** Short reasons drawn from the answers, best first. */
  reasons: string[];
  score: number;
}

export function reflectionQuestions(item: ItemDTO, income: IncomeSettingsDTO | null): ReflectionQuestion[] {
  const price = formatPrice(item.price, item.currency);
  const hours = workHoursFor(item.price, income);

  const valueQuestion: ReflectionQuestion =
    hours !== null && income
      ? {
          id: "worth",
          prompt: `${price} is about ${formatWorkTime(hours, income.hoursPerWeek)} of work. Is it worth that much of your time?`,
          answers: [
            { label: "Yes, definitely", score: 2, note: "It's worth the hours you'd work for it" },
            { label: "I'm not sure", score: -1, note: "You're unsure it's worth the hours" },
            { label: "No, not really", score: -3, note: "It isn't worth the hours you'd work for it" },
          ],
        }
      : {
          id: "month",
          prompt: "Picture yourself a month from now. Will you still be glad you bought it?",
          answers: [
            { label: "Yes, for sure", score: 2, note: "You'd still be glad a month from now" },
            { label: "I'm not sure", score: -1, note: "You're not sure you'd still be glad later" },
            { label: "Probably not", score: -3, note: "You probably wouldn't be glad a month from now" },
          ],
        };

  return [
    {
      id: "need",
      prompt: `Let's think about ${item.name}. Do you need it, or do you just want it?`,
      answers: [
        { label: "I need it", score: 2, note: "It fills a real need" },
        { label: "I really want it", score: 0 },
        { label: "It just caught my eye", score: -2, note: "It mostly caught your eye" },
      ],
    },
    {
      id: "use",
      prompt: "How often would you actually use it?",
      answers: [
        { label: "Every day or week", score: 2, note: "You'd use it often" },
        { label: "Now and then", score: 0 },
        { label: "Probably rarely", score: -2, note: "You'd rarely use it" },
      ],
    },
    {
      id: "own",
      prompt: "Do you already have something that does the same job?",
      answers: [
        { label: "No, nothing like it", score: 1 },
        { label: "Yes, but it's worn out", score: 1, note: "It replaces something worn out" },
        { label: "Yes, and it still works", score: -2, note: "You already own something that works" },
      ],
    },
    {
      id: "afford",
      prompt: `Can you pay ${price} today without dipping into savings or using credit?`,
      answers: [
        { label: "Yes, comfortably", score: 2, note: "It fits your budget" },
        { label: "It'd be tight", score: -2, note: "It would stretch your budget" },
        { label: "No", score: -4, note: "You can't comfortably afford it right now", dealBreaker: true },
      ],
    },
    valueQuestion,
    {
      id: "mood",
      prompt: "Last one. How are you feeling right now?",
      answers: [
        { label: "Calm and clear-headed", score: 1 },
        { label: "Excited by a sale or ad", score: -1, note: "A sale or ad may be doing the talking" },
        { label: "Bored, stressed or down", score: -2, note: "Your mood may be doing the shopping" },
      ],
    },
  ];
}

/** Scores the answers (one per question, in order) into a verdict. */
export function reflectionVerdict(item: ItemDTO, answers: ReflectionAnswer[]): ReflectionResult {
  const score = answers.reduce((sum, a) => sum + a.score, 0);
  const dealBreaker = answers.find((a) => a.dealBreaker);
  // Concerns first, then positives, so the verdict explains itself.
  const concerns = answers.filter((a) => a.note && a.score < 0).sort((a, b) => a.score - b.score);
  const positives = answers.filter((a) => a.note && a.score > 0).sort((a, b) => b.score - a.score);

  if (dealBreaker || score < 0) {
    return {
      verdict: "skip",
      title: "Maybe let this one go",
      message: `From your answers, ${item.name} doesn't seem worth it right now. Letting it go is a win too.`,
      reasons: concerns.map((a) => a.note!).slice(0, 3),
      score,
    };
  }
  if (score >= 6 && concerns.length === 0) {
    return {
      verdict: "buy",
      title: "Looks like a thoughtful buy",
      message: `You've thought ${item.name} through, and it holds up. Enjoy it!`,
      reasons: positives.map((a) => a.note!).slice(0, 3),
      score,
    };
  }
  return {
    verdict: "wait",
    title: "It's a close call",
    message: `There are good reasons for ${item.name}, and a few doubts. Giving it more time could make the choice clearer.`,
    reasons: [...concerns, ...positives].map((a) => a.note!).slice(0, 3),
    score,
  };
}
