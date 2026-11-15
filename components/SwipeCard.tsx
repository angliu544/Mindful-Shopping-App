/* eslint-disable @next/next/no-img-element -- static SVG design assets */
"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { formatWorkTime, workHoursFor } from "@/lib/income";
import LocalDate from "@/components/LocalDate";
import type { ItemDecision, ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

/** Horizontal distance (px) a card must be dragged to count as a swipe. */
export const SWIPE_THRESHOLD = 110;

export type CardExit = ItemDecision | "later";

type Props = {
  item: ItemDTO;
  income: IncomeSettingsDTO | null;
  /**
   * Position in the stack: 0 = front. Fractional while the front card is being
   * dragged, so the cards behind ease forward with it.
   */
  depth: number;
  /** Set while this card animates away after an action. */
  exit: CardExit | null;
  disabled: boolean;
  onDecision: (decision: ItemDecision) => void;
  onLater: () => void;
  /** Reports the horizontal drag offset of the front card (0 when released). */
  onDrag: (dx: number) => void;
};

const roundButton =
  "relative flex size-[72px] shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 sm:size-[123px]";

export default function SwipeCard({ item, income, depth, exit, disabled, onDecision, onLater, onDrag }: Props) {
  // The card leaving the deck is no longer the front one; the next card takes over.
  const front = depth === 0 && !exit;
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);

  function setOffset(next: number) {
    setDx(next);
    onDrag(next);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!front || disabled || exit || (e.pointerType === "mouse" && e.button !== 0)) return;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    setOffset(e.clientX - startX.current);
  }

  function endDrag(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    if (startX.current === null) return;
    const distance = e.clientX - startX.current;
    startX.current = null;
    setDragging(false);
    setOffset(0);
    if (!cancelled && Math.abs(distance) >= SWIPE_THRESHOLD) onDecision(distance > 0 ? "buy" : "skip");
  }

  // Front card follows the pointer; cards behind sit up and to the right, like the Figma stack.
  let transform = `translate(calc(var(--stack-x) * ${depth}), calc(var(--stack-y) * ${depth}))`;
  let opacity = depth > 2 ? 0 : 1;
  if (exit === "buy" || exit === "skip") {
    const dir = exit === "buy" ? 1 : -1;
    transform = `translateX(${dir * 130}%) rotate(${dir * 18}deg)`;
    opacity = 0;
  } else if (exit === "later") {
    transform = "translateY(18%) scale(0.88)";
    opacity = 0;
  } else if (front && dx !== 0) {
    transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
  }

  const buyStamp = exit === "buy" ? 1 : Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1);
  const skipStamp = exit === "skip" ? 1 : Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1);
  const workHours = workHoursFor(item.price, income);
  // Content fades in as a card reaches the front; behind, cards show as plain frames.
  const contentOpacity = exit ? 1 : Math.max(0, 1 - depth);

  const style: CSSProperties = {
    transform,
    opacity,
    zIndex: exit ? 50 : 40 - Math.round(depth * 10),
    touchAction: "pan-y",
    transition: dragging
      ? "none"
      : "transform 360ms cubic-bezier(0.22, 0.8, 0.3, 1), opacity 360ms ease-out",
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      style={style}
      aria-hidden={!front}
      inert={!front}
      className={`sk sk-card sk-over col-start-1 row-start-1 flex select-none flex-col overflow-hidden rounded-[44px] shadow-card motion-reduce:!transition-none sm:rounded-[69px] ${
        front ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      data-testid={front ? "swipe-card" : "stacked-card"}
    >
      <div className="flex flex-1 flex-col" style={{ opacity: contentOpacity, transition: dragging ? "none" : "opacity 300ms ease-out" }}>
        <div className="relative aspect-[741/418] max-h-[34svh] w-full bg-photo sm:max-h-[45svh]">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            priority={front}
            sizes="(max-width: 780px) 100vw, 741px"
            draggable={false}
            className="pointer-events-none object-cover"
          />
          <span
            aria-hidden
            style={{ opacity: buyStamp }}
            className="sk sk-badge-skip absolute left-5 top-5 -rotate-12 rounded-[18px] px-4 py-1 text-[30px] text-deep sm:left-8 sm:top-8 sm:text-[44px]"
          >
            BUY
          </span>
          <span
            aria-hidden
            style={{ opacity: skipStamp }}
            className="sk absolute right-5 top-5 rotate-12 rounded-[18px] px-4 py-1 text-[30px] text-canvas [--sk-bg:var(--color-danger-bg)] [--sk-edge:var(--color-danger)] [--sk-w:3px] sm:right-8 sm:top-8 sm:text-[44px]"
          >
            SKIP
          </span>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-5 pt-3 sm:px-[26px] sm:pb-7">
          <div className="flex items-start justify-between gap-4">
            <h2 className="min-w-0 break-words text-[32px] leading-tight text-body sm:text-[55px]">{item.name}</h2>
            <div className="shrink-0 pt-1 text-right text-deep sm:pt-3">
              <p className="text-[28px] leading-none sm:text-[42px]">{formatPrice(item.price, item.currency)}</p>
              {workHours !== null && income ? (
                <p className="mt-1 text-base sm:mt-2 sm:text-[21px]">≈ {formatWorkTime(workHours, income.hoursPerWeek)} of work</p>
              ) : (
                !income && (
                  <Link
                    href="/settings"
                    onPointerDown={(e) => e.stopPropagation()}
                    className="mt-1 block text-base text-link underline underline-offset-2 sm:mt-2 sm:text-[21px]"
                  >
                    See it in work hours
                  </Link>
                )
              )}
            </div>
          </div>
          {item.description && <p className="mt-1 text-lg text-body sm:mt-2 sm:text-[25px]">{item.description}</p>}
          <p className="mt-auto pt-3 text-base text-body sm:text-[21px]">
            Added <LocalDate iso={item.createdAt} format="longDateTime" />
          </p>

          <div className="mt-3 flex items-center justify-center gap-6 sm:mt-4 sm:gap-[84px]">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onDecision("skip")}
              disabled={disabled || !front}
              aria-label="Do Not Buy"
              title="Do Not Buy"
              className={roundButton}
            >
              <img src="/figma/card-btn-skip.svg" alt="" width={127} height={127} className="absolute inset-0 size-full" />
              <span aria-hidden className="relative text-[48px] leading-none text-[#f8f9fb] sm:text-[83px]">
                x
              </span>
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onLater}
              disabled={disabled || !front}
              aria-label="Need More Time"
              title="Need More Time"
              className={roundButton}
            >
              <img src="/figma/card-btn-later.svg" alt="" width={127} height={127} className="absolute inset-0 size-full" />
              <img src="/figma/clock-icon.svg" alt="" width={75} height={74} className="relative w-9 sm:w-[63px]" />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onDecision("buy")}
              disabled={disabled || !front}
              aria-label="Buy"
              title="Buy"
              className={roundButton}
            >
              <img src="/figma/card-btn-buy.svg" alt="" width={127} height={127} className="absolute inset-0 size-full" />
              <span aria-hidden className="relative text-[48px] leading-none text-[#f8f9fb] sm:text-[83px]">
                $
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
