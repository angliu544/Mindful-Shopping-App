/* eslint-disable @next/next/no-img-element -- static SVG design assets */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { reflectionQuestions, reflectionVerdict, type ReflectionAnswer, type Verdict } from "@/lib/reflection";
import type { ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

export type ReflectionChoice = "buy" | "skip" | "later";

/** Pause before each bot message, so it reads like a conversation. */
const TYPING_MS = 650;

const SUGGESTED: Record<Verdict, ReflectionChoice> = { buy: "buy", wait: "later", skip: "skip" };

type Props = {
  item: ItemDTO;
  income: IncomeSettingsDTO | null;
  onChoose: (choice: ReflectionChoice) => void;
  onClose: () => void;
};

/**
 * "Let's reflect": a short chat that runs before a Buy. It asks a few
 * questions, weighs the answers and suggests buy / wait / let it go. Nothing
 * is saved; it only helps the decision.
 */
export default function ReflectionChat({ item, income, onChoose, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const questions = useMemo(() => reflectionQuestions(item, income), [item, income]);
  const [answers, setAnswers] = useState<ReflectionAnswer[]>([]);
  // Bot messages in order: greeting, one per question, then the verdict.
  const [shownBot, setShownBot] = useState(0);

  // A deal-breaker answer (e.g. can't afford it) ends the questions early.
  const done = answers.length === questions.length || answers.some((a) => a.dealBreaker);
  const result = done ? reflectionVerdict(item, answers) : null;
  const questionsShown = done ? answers.length : Math.min(answers.length + 1, questions.length);
  const botNeeded = 1 + questionsShown + (done ? 1 : 0);
  const typing = shownBot < botNeeded;
  const currentQuestion = !done && shownBot > answers.length + 1 ? questions[answers.length] : null;
  const showVerdict = done && shownBot >= answers.length + 2;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  // Reveal the next bot message after a short "typing" pause.
  useEffect(() => {
    if (!typing) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => setShownBot((n) => n + 1), reduceMotion ? 0 : TYPING_MS);
    return () => clearTimeout(timer);
  }, [typing, shownBot]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [shownBot, answers.length]);

  function answer(a: ReflectionAnswer) {
    setAnswers((prev) => [...prev, a]);
  }

  function restart() {
    setAnswers([]);
    setShownBot(1);
  }

  const suggested = result ? SUGGESTED[result.verdict] : null;
  const choiceButton = (choice: ReflectionChoice) =>
    `sk relative flex min-h-[56px] flex-1 items-center justify-center rounded-[20px] px-4 text-2xl sm:min-h-[64px] sm:text-[28px] ${
      choice === "buy" ? "sk-btn text-canvas" : choice === "skip" ? "sk-tile text-danger" : "sk-tile text-body"
    } ${suggested === choice ? "outline-3 outline-offset-3 outline-link" : ""}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reflect-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(94vw,707px)] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-heading/40 backdrop:backdrop-blur-[2px]"
    >
      <div className="sk sk-modal flex max-h-[92dvh] flex-col overflow-hidden rounded-[40px] sm:rounded-[60px]">
        <div className="sk sk-bar relative flex h-[72px] shrink-0 items-center justify-center gap-3 sm:h-[92px] sm:gap-6">
          <img src="/figma/modal-star-left.svg" alt="" width={51} height={46} className="hidden w-11 sm:block" />
          <h2 id="reflect-title" className="text-[36px] leading-none text-canvas sm:text-[54px]">
            Let&apos;s reflect
          </h2>
          <img src="/figma/modal-star-right.svg" alt="" width={51} height={46} className="hidden w-11 sm:block" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reflection"
            className="absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full sm:right-6 sm:size-[64px]"
          >
            <img src="/figma/modal-close.svg" alt="" width={84} height={84} className="absolute inset-0 size-full" />
            <span aria-hidden className="relative -translate-y-[0.06em] text-[26px] leading-none text-canvas sm:text-[34px]">
              x
            </span>
          </button>
        </div>

        <div role="log" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
          {shownBot > 0 && (
            <BotBubble>
              Hi! Before you buy <span className="text-deep">{item.name}</span>, let&apos;s take a minute to reflect. Just tap
              an answer.
            </BotBubble>
          )}
          {questions.slice(0, questionsShown).map((q, i) =>
            shownBot > i + 1 ? (
              <div key={q.id} className="space-y-4">
                <BotBubble>{q.prompt}</BotBubble>
                {answers[i] && <UserBubble>{answers[i].label}</UserBubble>}
              </div>
            ) : null,
          )}
          {showVerdict && result && (
            <BotBubble>
              <p className="text-[26px] leading-tight text-deep sm:text-[32px]" data-testid="reflection-verdict">
                {result.title}
              </p>
              <p className="mt-1">{result.message}</p>
              {result.reasons.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {result.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-2">
                      <img src="/figma/history-star-1.svg" alt="" width={25} height={24} className="mt-1.5 w-4 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </BotBubble>
          )}
          {typing && <TypingDots />}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 border-t-2 border-panel-edge/60 px-4 pb-5 pt-4 sm:px-8 sm:pb-7">
          {currentQuestion && (
            <div key={currentQuestion.id} className="flex flex-wrap justify-center gap-2 sm:gap-3" role="group" aria-label="Your answer">
              {currentQuestion.answers.map((a, i) => (
                <button
                  key={a.label}
                  type="button"
                  autoFocus={i === 0}
                  onClick={() => answer(a)}
                  className="sk sk-field rounded-[18px] px-4 py-2 text-xl text-heading hover:brightness-[0.97] sm:text-[24px]"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {showVerdict && (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                {(["skip", "later", "buy"] as const).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    autoFocus={suggested === choice}
                    onClick={() => onChoose(choice)}
                    className={choiceButton(choice)}
                  >
                    {choice === "buy" ? "Buy it" : choice === "skip" ? "Don’t buy" : "Need more time"}
                    {suggested === choice && (
                      <span className="absolute -top-3 right-3 rounded-full bg-link px-2 text-sm text-canvas sm:text-base">
                        Suggested
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <button type="button" onClick={restart} className="mx-auto block text-lg text-link underline underline-offset-2 sm:text-[22px]">
                Start over
              </button>
            </div>
          )}

          {!showVerdict && (
            <button
              type="button"
              onClick={() => onChoose("buy")}
              className="mx-auto mt-4 block text-base text-muted underline underline-offset-2 sm:text-lg"
            >
              I&apos;ve already thought it through, just buy it
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}

function BotBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <span aria-hidden className="sk sk-btn mt-1 flex size-9 shrink-0 items-center justify-center rounded-full sm:size-11">
        <img src="/figma/modal-star-small.svg" alt="" width={28} height={27} className="w-5 brightness-[3] sm:w-6" />
      </span>
      <div className="sk sk-tile max-w-[85%] rounded-[24px] rounded-tl-[8px] px-4 py-3 text-xl text-body sm:text-[24px]">
        <span className="sr-only">Consider: </span>
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="sk sk-btn max-w-[80%] rounded-[24px] rounded-tr-[8px] px-4 py-3 text-xl text-canvas sm:text-[24px]">
        <span className="sr-only">You: </span>
        {children}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-2 pl-11 sm:pl-14" aria-label="Consider is typing" role="status">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-3 animate-bounce rounded-full bg-faint motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
