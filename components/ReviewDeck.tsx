"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import LocalDate from "@/components/LocalDate";
import SwipeCard from "@/components/SwipeCard";
import type { ApiErrorBody, ApiErrorCode, ItemResponse, ReviewQueueResponse } from "@/types/api";
import type { ItemDecision, ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

/** Matches the card's exit transition so it finishes before the next card shows. */
const EXIT_MS = 300;

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

export default function ReviewDeck({
  initial,
  income,
}: {
  initial: ReviewQueueResponse;
  income: IncomeSettingsDTO | null;
}) {
  const [items, setItems] = useState<ItemDTO[]>(initial.items);
  const [nextAvailableAt, setNextAvailableAt] = useState(initial.nextAvailableAt);
  const [exit, setExit] = useState<{ id: string; decision: ItemDecision } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDecision, setLastDecision] = useState<{ item: ItemDTO; decision: ItemDecision } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // A ref, not state, so two clicks in the same frame can't both get through.
  const lockRef = useRef(false);

  const current = items[0];

  const decide = useCallback(
    async (decision: ItemDecision) => {
      const item = items[0];
      if (!item || lockRef.current) return;
      lockRef.current = true;
      setBusy(true);
      setError(null);
      setExit({ id: item.id, decision });

      const [result] = await Promise.all([
        request<ItemResponse>(`/api/items/${item.id}/decision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }),
        wait(EXIT_MS),
      ]);

      if (result.ok) {
        setItems((queue) => queue.filter((i) => i.id !== item.id));
        setLastDecision({ item, decision });
        setAnnouncement(`${item.name}: ${decisionLabel[decision]}.`);
      } else if (result.code === "already_reviewed" || result.code === "not_found") {
        // Decided elsewhere (e.g. another tab) or gone: drop it from this queue.
        setItems((queue) => queue.filter((i) => i.id !== item.id));
        setLastDecision(null);
        setError(result.message);
      } else {
        setError(result.message);
      }

      setExit(null);
      setBusy(false);
      lockRef.current = false;
    },
    [items],
  );

  async function undo() {
    if (!lastDecision || lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    setError(null);

    const result = await request<ItemResponse>(`/api/items/${lastDecision.item.id}/decision`, {
      method: "DELETE",
    });
    if (result.ok) {
      const restored = result.data.item;
      setItems((queue) => [restored, ...queue.filter((i) => i.id !== restored.id)]);
      setAnnouncement(`Undid decision on ${restored.name}.`);
    } else {
      setError(result.message);
    }
    setLastDecision(null);
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

  // Arrow keys as a shortcut; the buttons remain the primary accessible control.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        void decide("buy");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        void decide("skip");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [decide]);

  return (
    <div className="space-y-5">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {current ? (
        <>
          <div className="relative">
            {items.length > 1 && (
              <div
                aria-hidden
                className="absolute inset-x-3 -bottom-2 top-2 rounded-3xl border border-sage-100 bg-sage-50"
              />
            )}
            <SwipeCard
              key={current.id}
              item={current}
              income={income}
              exitDirection={exit?.id === current.id ? exit.decision : null}
              disabled={busy}
              onDecision={decide}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => decide("skip")}
              disabled={busy}
              className="rounded-full border-2 border-ink-muted/30 bg-paper px-4 py-3 font-medium text-ink hover:bg-sage-50 disabled:opacity-60"
            >
              Do Not Buy
            </button>
            <button
              type="button"
              onClick={() => decide("buy")}
              disabled={busy}
              className="rounded-full bg-sage-600 px-4 py-3 font-medium text-white hover:bg-sage-700 disabled:opacity-60"
            >
              Buy
            </button>
          </div>
          <p className="text-center text-sm text-ink-muted">
            {items.length} {items.length === 1 ? "item" : "items"} to review · swipe, tap, or use ← →
          </p>
        </>
      ) : (
        <EmptyState
          title="Nothing to review right now"
          actions={
            <>
              <Link
                href="/upload"
                className="rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700"
              >
                Add an item
              </Link>
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="rounded-full border border-sage-200 px-6 py-3 font-medium hover:bg-sage-50 disabled:opacity-60"
              >
                {refreshing ? "Checking…" : "Check again"}
              </button>
            </>
          }
        >
          {nextAvailableAt ? (
            <p>
              Your next item will be ready <LocalDate iso={nextAvailableAt} format="dateTime" />.
            </p>
          ) : (
            <p>Items appear here 24 hours after you add them.</p>
          )}
        </EmptyState>
      )}

      {lastDecision && (
        <div className="flex items-center justify-center gap-2 text-sm text-ink-muted">
          <span>
            Marked <span className="font-medium text-ink">{lastDecision.item.name}</span> as{" "}
            {decisionLabel[lastDecision.decision].toLowerCase()}.
          </span>
          <button
            type="button"
            onClick={undo}
            disabled={busy}
            className="rounded-full px-3 py-1 font-medium text-sage-700 underline underline-offset-2 hover:bg-sage-50 disabled:opacity-60"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
