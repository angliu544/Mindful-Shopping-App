"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  REFLECTION_QUESTIONS,
  reflectionBand,
  resolveReflection,
  type ReflectionAnswers,
} from "@/lib/reflection";
import type { ItemDecision } from "@/types/item";

const TOTAL = REFLECTION_QUESTIONS.length;
/** Steps 0..TOTAL-1 are questions; TOTAL is the summary. */
const SUMMARY_STEP = TOTAL;

type Props = {
  itemName: string;
  open: boolean;
  onClose: () => void;
  /** answers is null when the user chose to skip the questions. */
  onDecide: (decision: ItemDecision, answers: ReflectionAnswers | null) => void;
  /** Sends the item back for another waiting period without deciding. */
  onNeedMoreTime: () => void;
};

const formatScore = (score: number) => (score > 0 ? `+${score}` : String(score));

/**
 * A hardcoded, chat-style reflection shown before a purchase is confirmed. It
 * never decides for the user: both choices are always available at the end.
 * Answers are kept while the dialog is closed, so reopening resumes where the
 * user left off (the parent remounts it per item).
 */
export default function ReflectionChatbot({ itemName, open, onClose, onDecide, onNeedMoreTime }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ReflectionAnswers>({});
  const [skipped, setSkipped] = useState(false);
  // Guards against a double tap on the final buttons; reset whenever it reopens.
  const submittedRef = useRef(false);

  // Keep the native modal in sync with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      submittedRef.current = false;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Stop the page behind the sheet from scrolling on mobile.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus to the newest bot message so each step is announced.
  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, step, skipped]);

  const onSummary = step === SUMMARY_STEP;
  const question = onSummary ? null : REFLECTION_QUESTIONS[step];
  const selectedId = question ? answers[question.id] : undefined;
  const selected = question?.answers.find((a) => a.id === selectedId);
  const result = onSummary && !skipped ? resolveReflection(answers) : null;

  function choose(answerId: string) {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: answerId }));
  }

  function next() {
    if (selected) setStep((s) => Math.min(s + 1, SUMMARY_STEP));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function skipQuestions() {
    setSkipped(true);
    setStep(SUMMARY_STEP);
  }

  function reviewAnswers() {
    setSkipped(false);
    setStep(0);
  }

  function decide(decision: ItemDecision) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onDecide(decision, result ? answers : null);
  }

  function needMoreTime() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onNeedMoreTime();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reflection-title"
      onClose={onClose}
      // A click on the dialog element itself (not its content) is the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="mx-auto mb-0 mt-auto max-h-[92svh] w-full max-w-full overflow-hidden rounded-t-3xl bg-cream p-0 text-ink shadow-xl backdrop:bg-ink/40 sm:mb-auto sm:max-w-lg sm:rounded-3xl"
      data-testid="reflection-chatbot"
    >
      <div className="flex max-h-[92svh] flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-sage-100 bg-paper px-5 py-4">
          <div className="min-w-0">
            <p id="reflection-title" className="font-serif text-lg font-semibold">
              A moment to reflect
            </p>
            <p className="truncate text-sm text-ink-muted">{itemName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reflection"
            className="-mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl leading-none text-ink-muted hover:bg-sage-50"
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {question ? (
            <>
              <div>
                <p className="text-sm font-medium text-sage-700">
                  Question {step + 1} of {TOTAL}
                </p>
                <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage-100">
                  <div
                    className="h-full rounded-full bg-sage-500 transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
                  />
                </div>
              </div>

              {step === 0 && (
                <BotBubble>
                  Before you decide, here are a few quick questions. There are no wrong answers, and the
                  choice stays yours.
                </BotBubble>
              )}
              <BotBubble>
                <h2
                  ref={headingRef}
                  id="reflection-question"
                  tabIndex={-1}
                  className="font-medium outline-none"
                >
                  {question.prompt}
                </h2>
              </BotBubble>
              {selected && <UserBubble>{selected.label}</UserBubble>}

              <div role="group" aria-labelledby="reflection-question" className="grid gap-2 pt-1">
                {question.answers.map((answer) => {
                  const isSelected = answer.id === selectedId;
                  return (
                    <button
                      key={answer.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => choose(answer.id)}
                      className={`rounded-2xl border-2 px-4 py-3 text-left font-medium transition-colors ${
                        isSelected
                          ? "border-sage-600 bg-sage-50 text-sage-700"
                          : "border-sage-100 bg-paper text-ink hover:border-sage-200 hover:bg-sage-50"
                      }`}
                    >
                      {answer.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <BotBubble>
                <h2 ref={headingRef} tabIndex={-1} className="font-medium outline-none">
                  {result ? "Thank you for taking a moment." : "No problem. You can still decide either way."}
                </h2>
              </BotBubble>

              {result && (
                <BotBubble>
                  <p className="text-sm text-ink-muted">
                    Reflection score{" "}
                    <span className="font-semibold text-ink" data-testid="reflection-score">
                      {formatScore(result.score)}
                    </span>
                  </p>
                  <p className="mt-1 font-semibold text-sage-700">{reflectionBand(result.score).label}</p>
                  <p className="mt-1" data-testid="reflection-summary">
                    {reflectionBand(result.score).summary}
                  </p>
                </BotBubble>
              )}

              <p className="px-1 text-xs text-ink-muted">
                This is a prompt for your own reflection, not financial or professional advice. Whatever you
                choose is okay.
              </p>
            </>
          )}
        </div>

        <footer className="border-t border-sage-100 bg-paper px-5 py-4">
          {question ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={back}
                  disabled={step === 0}
                  className="flex-1 rounded-full border border-sage-200 px-4 py-3 font-medium hover:bg-sage-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={next}
                  disabled={!selected}
                  className="flex-1 rounded-full bg-sage-600 px-4 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-50"
                >
                  {step === TOTAL - 1 ? "See summary" : "Next"}
                </button>
              </div>
              <button
                type="button"
                onClick={skipQuestions}
                className="mx-auto block rounded-full px-3 py-1 text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                Skip the questions
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => decide("buy")}
                className="rounded-full bg-sage-600 px-4 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-60"
              >
                Confirm Buy
              </button>
              <button
                type="button"
                onClick={() => decide("skip")}
                className="rounded-full border-2 border-ink-muted/30 bg-paper px-4 py-3 font-medium hover:bg-sage-50 disabled:opacity-60"
              >
                Mark Do Not Buy Instead
              </button>
              <button
                type="button"
                onClick={needMoreTime}
                className="rounded-full border-2 border-dashed border-sage-200 bg-cream px-4 py-3 font-medium text-sage-700 hover:bg-sage-50"
              >
                Need More Time
              </button>
              <button
                type="button"
                onClick={reviewAnswers}
                className="rounded-full px-4 py-2 text-sm font-medium text-sage-700 underline underline-offset-2 hover:bg-sage-50 disabled:opacity-60"
              >
                {skipped ? "Answer the questions" : "Review Answers"}
              </button>
            </div>
          )}
        </footer>
      </div>
    </dialog>
  );
}

function BotBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-end gap-2">
      <span aria-hidden className="mb-1 h-7 w-7 shrink-0 rounded-full bg-sage-200" />
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-paper px-4 py-3 shadow-sm ring-1 ring-sage-100">
        <span className="sr-only">Guide: </span>
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-sage-600 px-4 py-3 text-white">
        <span className="sr-only">Your answer: </span>
        {children}
      </p>
    </div>
  );
}
