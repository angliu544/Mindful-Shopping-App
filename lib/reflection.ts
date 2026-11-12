// The guided reflection shown before confirming a purchase. Fully hardcoded:
// no AI, no external service. Shared by the chatbot (client) and the decision
// API (server). The browser only ever sends question and answer ids; the server
// looks up the text and scores here, so a client can't submit its own score.

export interface ReflectionAnswer {
  id: string;
  label: string;
  score: number;
}

export interface ReflectionQuestion {
  id: string;
  prompt: string;
  answers: readonly ReflectionAnswer[];
}

export const REFLECTION_QUESTIONS: readonly ReflectionQuestion[] = [
  {
    id: "own-similar",
    prompt: "Do you already own something similar?",
    answers: [
      { id: "yes", label: "Yes", score: -2 },
      { id: "no", label: "No", score: 1 },
      { id: "unsure", label: "I am not sure", score: -1 },
    ],
  },
  {
    id: "necessary",
    prompt: "Is this item necessary right now?",
    answers: [
      { id: "need", label: "Yes, I need it", score: 2 },
      { id: "useful", label: "It would be useful", score: 1 },
      { id: "want", label: "No, I mostly want it", score: -2 },
    ],
  },
  {
    id: "frequency",
    prompt: "How often do you expect to use it?",
    answers: [
      { id: "daily", label: "Every day", score: 2 },
      { id: "weekly", label: "A few times a week", score: 1 },
      { id: "occasionally", label: "Occasionally", score: 0 },
      { id: "rarely", label: "Rarely", score: -2 },
      { id: "unsure", label: "I am not sure", score: -1 },
    ],
  },
  {
    id: "budget",
    prompt: "Does this purchase fit within your budget?",
    answers: [
      { id: "yes", label: "Yes", score: 2 },
      { id: "tighter", label: "It would make my budget tighter", score: -1 },
      { id: "no", label: "No", score: -3 },
      { id: "unsure", label: "I am not sure", score: -1 },
    ],
  },
  {
    id: "reason",
    prompt: "What is the main reason you want this item?",
    answers: [
      { id: "need", label: "I need it", score: 2 },
      { id: "replace", label: "It will replace something I own", score: 1 },
      { id: "easier", label: "It will make my life easier", score: 1 },
      { id: "looks", label: "I like how it looks", score: 0 },
      { id: "advertised", label: "I saw it recommended or advertised", score: -1 },
      { id: "unsure", label: "I am not sure", score: -1 },
    ],
  },
];

/** Selected answer id per question id. */
export type ReflectionAnswers = Record<string, string>;

/** One answered question as stored on the item. */
export interface ReflectionResponse {
  question: string;
  answer: string;
  score: number;
}

export interface ReflectionResult {
  responses: ReflectionResponse[];
  score: number;
}

export interface ReflectionBand {
  /** A few words, for compact places like the history list. */
  label: string;
  summary: string;
}

/** A gentle reading of the total score. It's a prompt to reflect, never advice. */
export function reflectionBand(score: number): ReflectionBand {
  if (score >= 4) {
    return {
      label: "Clear need",
      summary: "This purchase seems connected to a clear need or frequent use.",
    };
  }
  if (score >= 0) {
    return {
      label: "Worth more thought",
      summary: "This item may be useful, but it may be worth thinking about it a little longer.",
    };
  }
  return {
    label: "Possible impulse",
    summary:
      "This may be an impulse purchase. Consider waiting or looking for something you already own that could serve the same purpose.",
  };
}

/**
 * Turns answer ids into stored responses and a total score. Returns null unless
 * every question has exactly one valid answer and nothing else was sent.
 */
export function resolveReflection(answers: ReflectionAnswers): ReflectionResult | null {
  if (Object.keys(answers).length !== REFLECTION_QUESTIONS.length) return null;

  const responses: ReflectionResponse[] = [];
  for (const question of REFLECTION_QUESTIONS) {
    if (!Object.hasOwn(answers, question.id)) return null;
    const answer = question.answers.find((a) => a.id === answers[question.id]);
    if (!answer) return null;
    responses.push({ question: question.prompt, answer: answer.label, score: answer.score });
  }
  return { responses, score: responses.reduce((sum, r) => sum + r.score, 0) };
}
