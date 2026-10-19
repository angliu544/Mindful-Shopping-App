"use client";

import { useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import LocalDate from "@/components/LocalDate";
import { formatPrice } from "@/lib/format";
import { formatWorkTime, workHoursFor } from "@/lib/income";
import type { ItemDecision, ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

/** Horizontal distance (px) a card must be dragged to count as a swipe. */
const SWIPE_THRESHOLD = 110;

type Props = {
  item: ItemDTO;
  /** When set, the price is also shown as time worked. */
  income: IncomeSettingsDTO | null;
  /** Set while the card animates off-screen after a decision. */
  exitDirection: ItemDecision | null;
  disabled: boolean;
  onDecision: (decision: ItemDecision) => void;
};

export default function SwipeCard({ item, income, exitDirection, disabled, onDecision }: Props) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled || exitDirection || (e.pointerType === "mouse" && e.button !== 0)) return;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    setDx(e.clientX - startX.current);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (startX.current === null) return;
    const distance = e.clientX - startX.current;
    startX.current = null;
    setDragging(false);
    setDx(0);
    if (!cancelled && Math.abs(distance) >= SWIPE_THRESHOLD) {
      onDecision(distance > 0 ? "buy" : "skip");
    }
  }

  const workHours = workHoursFor(item.price, income);
  const offset = exitDirection ? 0 : dx;
  const transform = exitDirection
    ? `translateX(${exitDirection === "buy" ? 130 : -130}%) rotate(${exitDirection === "buy" ? 16 : -16}deg)`
    : `translateX(${offset}px) rotate(${offset / 20}deg)`;
  const buyOpacity = exitDirection === "buy" ? 1 : Math.min(Math.max(offset / SWIPE_THRESHOLD, 0), 1);
  const skipOpacity = exitDirection === "skip" ? 1 : Math.min(Math.max(-offset / SWIPE_THRESHOLD, 0), 1);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      style={{ transform, touchAction: "pan-y" }}
      className={`relative cursor-grab select-none overflow-hidden rounded-3xl border border-sage-100 bg-paper shadow-md active:cursor-grabbing ${
        exitDirection
          ? "opacity-0 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-opacity"
          : dragging
            ? ""
            : "transition-transform duration-300 ease-out motion-reduce:transition-none"
      }`}
      data-testid="swipe-card"
    >
      <div className="relative aspect-[4/5] max-h-[46svh] w-full bg-sage-50 sm:aspect-[4/3]">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          priority
          sizes="(max-width: 640px) 100vw, 576px"
          draggable={false}
          className="pointer-events-none object-cover"
        />
        <span
          aria-hidden
          style={{ opacity: buyOpacity }}
          className="absolute left-4 top-4 -rotate-12 rounded-xl border-2 border-sage-600 bg-paper/90 px-3 py-1 text-lg font-bold tracking-wider text-sage-700"
        >
          BUY
        </span>
        <span
          aria-hidden
          style={{ opacity: skipOpacity }}
          className="absolute right-4 top-4 rotate-12 rounded-xl border-2 border-ink-muted bg-paper/90 px-3 py-1 text-lg font-bold tracking-wider text-ink-muted"
        >
          SKIP
        </span>
      </div>

      <div className="space-y-2 p-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl font-semibold leading-tight">{item.name}</h2>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold text-sage-700">{formatPrice(item.price, item.currency)}</p>
            {workHours !== null && income ? (
              <p className="text-sm text-ink-muted">≈ {formatWorkTime(workHours, income.hoursPerWeek)} of work</p>
            ) : (
              !income && (
                <Link
                  href="/settings"
                  onPointerDown={(e) => e.stopPropagation()}
                  className="text-sm text-sage-700 underline underline-offset-2 hover:text-sage-600"
                >
                  See it in work hours
                </Link>
              )
            )}
          </div>
        </div>
        {item.description && <p className="text-ink-muted">&ldquo;{item.description}&rdquo;</p>}
        <dl className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm text-ink-muted">
          <div className="flex gap-1">
            <dt>Added</dt>
            <dd>
              <LocalDate iso={item.createdAt} format="dateTime" />
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>Ready since</dt>
            <dd>
              <LocalDate iso={item.availableAt} format="dateTime" />
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
