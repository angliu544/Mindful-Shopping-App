"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LocalDate from "@/components/LocalDate";
import ReflectionChat, { type ReflectionChoice } from "@/components/ReflectionChat";
import SwipeCard, { SWIPE_THRESHOLD, type CardExit } from "@/components/SwipeCard";
import type { ApiErrorBody, ApiErrorCode, ItemResponse, ReviewQueueResponse } from "@/types/api";
import type { ItemDecision, ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

/** Matches the card's exit transition so it finishes before the next card takes its place. */
const EXIT_MS = 360;
/** Front card + two visible behind it (as in Figma) + one waiting to slide in. */
const STACK_SIZE = 4;

type RequestResult<T> = { ok: true; data: T } | { ok: false; message: string; code?: ApiErrorCode };

async function request<T>(url: string, init: RequestInit): Promise<RequestResult<T>> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
    if (res.ok && data) return { ok: true, data };
    return { ok: false, message: data?.error ?? "Something went wrong. Please try again.", code: data?.code };
  } catch {
    return { ok: false, message: "We couldn't reach the server. Check your connection and try again." };
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const decisionLabel: Record<ItemDecision, string> = { buy: "Buy", skip: "Do not buy" };

/** The most recent action, shown under the deck. Only decisions can be undone. */
type LastAction =
  | { type: "decision"; item: ItemDTO; decision: ItemDecision }
  | { type: "snooze"; item: ItemDTO; availableAt: string };

const earlier = (a: string | null, b: string) => (a && a < b ? a : b);

export default function ReviewDeck({
  initial,
  income,
}: {
  initial: ReviewQueueResponse;
  income: IncomeSettingsDTO | null;
}) {
  const [items, setItems] = useState<ItemDTO[]>(initial.items);
  const [nextAvailableAt, setNextAvailableAt] = useState(initial.nextAvailableAt);
  const [exit, setExit] = useState<{ id: string; direction: CardExit } | null>(null);
  const [dragDx, setDragDx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // A ref, not state, so two clicks in the same frame can't both get through.
  const lockRef = useRef(false);
  // The item being reflected on before a Buy (the reflection chat is open).
  const [reflecting, setReflecting] = useState<ItemDTO | null>(null);

  /** Animates the front card away while the request runs, then hands back the result. */
  const act = useCallback(
    async (direction: CardExit, send: (item: ItemDTO) => Promise<RequestResult<ItemResponse>>) => {
      const item = items[0];
      if (!item || lockRef.current) return null;
      lockRef.current = true;
      setBusy(true);
      setError(null);
      setExit({ id: item.id, direction });
      const [result] = await Promise.all([send(item), wait(EXIT_MS)]);
      return { item, result };
    },
    [items],
  );

  const finish = () => {
    setExit(null);
    setBusy(false);
    lockRef.current = false;
  };

  const decide = useCallback(
    async (decision: ItemDecision) => {
      const done = await act(decision, (item) =>
        request<ItemResponse>(`/api/items/${item.id}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }),
      );
      if (!done) return;
      const { item, result } = done;
      if (result.ok) {
        setItems((queue) => queue.filter((i) => i.id !== item.id));
        setLastAction({ type: "decision", item, decision });
        setAnnouncement(`${item.name}: ${decisionLabel[decision]}.`);
      } else if (result.code === "already_reviewed" || result.code === "not_found") {
        // Decided elsewhere (e.g. another tab) or gone: drop it from this queue.
        setItems((queue) => queue.filter((i) => i.id !== item.id));
        setLastAction(null);
        setError(result.message);
      } else {
        setError(result.message);
      }
      finish();
    },
    [act],
  );

  /** "Need More Time": the item leaves the deck and comes back after another wait. */
  const needMoreTime = useCallback(async () => {
    const done = await act("later", (item) => request<ItemResponse>(`/api/items/${item.id}/snooze`, { method: "POST" }));
    if (!done) return;
    const { item, result } = done;
    if (result.ok) {
      const { availableAt } = result.data.item;
      setItems((queue) => queue.filter((i) => i.id !== item.id));
      setNextAvailableAt((next) => earlier(next, availableAt));
      setLastAction({ type: "snooze", item, availableAt });
      setAnnouncement(`${item.name} will come back later.`);
    } else if (result.code) {
      // Already decided or snoozed elsewhere, or gone: it no longer belongs here.
      setItems((queue) => queue.filter((i) => i.id !== item.id));
      setError(result.message);
    } else {
      setError(result.message);
    }
    finish();
  }, [act]);

  /** Buy goes through the reflection chat first. */
  const requestBuy = useCallback(() => {
    const item = items[0];
    if (!item || lockRef.current) return;
    setReflecting(item);
  }, [items]);

  function handleReflection(choice: ReflectionChoice) {
    setReflecting(null);
    if (choice === "later") void needMoreTime();
    else void decide(choice);
  }

  async function undo() {
    if (lastAction?.type !== "decision" || lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    setError(null);

    const result = await request<ItemResponse>(`/api/items/${lastAction.item.id}/decision`, { method: "DELETE" });
    if (result.ok) {
      const restored = result.data.item;
      setItems((queue) => [restored, ...queue.filter((i) => i.id !== restored.id)]);
      setAnnouncement(`Undid decision on ${restored.name}.`);
    } else {
      setError(result.message);
    }
    setLastAction(null);
    setBusy(false);
    lockRef.current = false;
  }

  async function refresh() {
    setRefreshing(true);
    setError(null);
    const result = await request<ReviewQueueResponse>("/api/items", { method: "GET", cache: "no-store" });
    if (result.ok) {
      setItems(result.data.items);
      setNextAvailableAt(result.data.nextAvailableAt);
    } else {
      setError(result.message);
    }
    setRefreshing(false);
  }

  // Keyboard shortcuts; the buttons remain the primary accessible controls.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], dialog")) return;
      const actions: Record<string, () => void> = {
        ArrowRight: () => requestBuy(),
        ArrowLeft: () => void decide("skip"),
        ArrowDown: () => void needMoreTime(),
      };
      const run = actions[e.key];
      if (run) {
        e.preventDefault();
        run();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [decide, needMoreTime, requestBuy]);

  // While the front card is dragged or leaving, the cards behind move up the stack.
  const advance = exit ? 1 : Math.min(Math.abs(dragDx) / SWIPE_THRESHOLD, 1) * 0.35;
  const visible = items.slice(0, STACK_SIZE);
  const hasItems = items.length > 0;

  return (
    <div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {reflecting && (
        <ReflectionChat
          key={reflecting.id}
          item={reflecting}
          income={income}
          onChoose={handleReflection}
          onClose={() => setReflecting(null)}
        />
      )}

      {hasItems ? (
        <header className="mx-auto max-w-[741px]">
          <h1 className="text-[34px] leading-tight text-heading sm:text-[58px]">Do you still want it?</h1>
          <p className="text-xl text-heading sm:text-[30px]">You had some time to reflect. See how you feel.</p>
        </header>
      ) : (
        <header className="mx-auto max-w-[618px]">
          <h1 className="text-[34px] leading-tight text-heading sm:text-[58px]">
            <span className="text-[40px] sm:text-[67px]">Oops!</span> Nothing here!
          </h1>
          <p className="text-xl text-heading sm:text-[30px]">There’s no rush. Check back later.</p>
        </header>
      )}

      {error && (
        <p
          role="alert"
          className="sk sk-field mx-auto mt-4 max-w-[741px] rounded-[10px] px-4 py-3 text-xl text-danger [--sk-edge:var(--color-danger)]"
        >
          {error}
        </p>
      )}

      {hasItems ? (
        <>
          {/* isolate: the cards' z-index (40–50) only orders the stack, never the page's menus. */}
          <div className="isolate mx-auto mt-3 grid max-w-[781px] pr-[20px] pt-[10px] [--stack-x:10px] [--stack-y:-5px] sm:mt-4 sm:pr-[40px] sm:pt-[12px] sm:[--stack-x:20px] sm:[--stack-y:-6px]">
            {visible.map((item, index) => {
              const leaving = exit?.id === item.id;
              const depth = leaving ? 0 : Math.max(0, index - advance);
              return (
                <SwipeCard
                  key={item.id}
                  item={item}
                  income={income}
                  depth={depth}
                  exit={leaving ? exit.direction : null}
                  disabled={busy || reflecting !== null}
                  onDecision={(decision) => (decision === "buy" ? requestBuy() : void decide(decision))}
                  onLater={needMoreTime}
                  onDrag={setDragDx}
                />
              );
            })}
          </div>
          <p className="mt-3 text-center text-lg text-muted sm:text-[22px]">
            {items.length} {items.length === 1 ? "item" : "items"} to review · swipe, tap, or use ← ↓ →
          </p>
        </>
      ) : (
        <div className="sk sk-outline mx-auto mt-8 flex max-w-[657px] flex-col items-center rounded-[48px] px-6 pb-8 pt-10 text-center sm:mt-[51px] sm:rounded-[69px] sm:px-12 sm:pb-[30px] sm:pt-[58px]">
          <p className="max-w-[402px] text-[30px] leading-snug text-heading sm:text-[45px]">
            {nextAvailableAt ? (
              <>
                Your next item will be ready <LocalDate iso={nextAvailableAt} format="dateTime" />
              </>
            ) : (
              "Items appear here 24 hours after you add them"
            )}
          </p>
          <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:mt-[110px] sm:flex-row sm:gap-12">
            <Link
              href="/upload"
              className="sk sk-btn flex h-[72px] w-full max-w-[251px] items-center justify-center rounded-full text-[30px] text-canvas sm:h-[103px] sm:text-[36px]"
            >
              Add an Item
            </Link>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="sk sk-btn-soft flex h-[72px] w-full max-w-[251px] items-center justify-center rounded-full text-[30px] text-[#fafbff] disabled:opacity-60 sm:h-[103px] sm:text-[36px]"
            >
              {refreshing ? "Checking…" : "Check again"}
            </button>
          </div>
        </div>
      )}

      {lastAction?.type === "snooze" && (
        <p className="mt-4 text-center text-lg text-muted sm:text-[22px]" data-testid="snooze-notice">
          <span className="text-deep">{lastAction.item.name}</span> will be back{" "}
          <LocalDate iso={lastAction.availableAt} format="dateTime" />.
        </p>
      )}

      {lastAction?.type === "decision" && (
        <div className="mt-4 flex items-center justify-center gap-3 text-lg text-muted sm:text-[22px]">
          <span>
            Marked <span className="text-deep">{lastAction.item.name}</span> as{" "}
            {decisionLabel[lastAction.decision].toLowerCase()}.
          </span>
          <button
            type="button"
            onClick={undo}
            disabled={busy}
            className="sk sk-btn rounded-[14px] px-3 py-1 text-canvas disabled:opacity-60"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
