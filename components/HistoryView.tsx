/* eslint-disable @next/next/no-img-element -- static SVG design assets */
"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LocalDate, { useIsClient } from "@/components/LocalDate";
import { formatPrice } from "@/lib/format";
import { statsFor, yearsWithDecisions, type Period } from "@/lib/history";
import { formatWorkTime, workHoursFor } from "@/lib/income";
import type { HistoryResponse } from "@/types/api";
import type { ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

type ItemFilter = "all" | "buy" | "skip";

const ITEM_FILTERS: { value: ItemFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "buy", label: "Bought" },
  { value: "skip", label: "Didn’t Buy" },
];

/** "$1,000.00": symbol and amount apart, so the "$" can be drawn smaller as in Figma. */
function splitMoney(amount: number): { symbol: string; value: string } {
  const value = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return { symbol: "$", value };
}

export default function HistoryView({ history, income }: { history: HistoryResponse; income: IncomeSettingsDTO | null }) {
  const isClient = useIsClient();
  // Server render and hydration use UTC; the browser then switches to the viewer's own time zone.
  const timeZone = isClient ? undefined : "UTC";
  const currentYear = Number(new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone }).format(new Date()));

  const [period, setPeriod] = useState<Period | "current">("current");
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");

  const selected: Period = period === "current" ? currentYear : period;
  const years = yearsWithDecisions(history.items, currentYear, timeZone);
  // All-time totals come from the database, so they're exact even beyond the loaded items.
  const stats = selected === "all" ? history.stats : statsFor(history.items, selected, timeZone);
  const title =
    selected === "all" ? "Money saved overall:" : selected === currentYear ? "Money saved this year:" : `Money saved in ${selected}:`;
  const money = splitMoney(stats.moneySaved);
  const hoursSaved = workHoursFor(stats.moneySaved, income);

  const shownItems = itemFilter === "all" ? history.items : history.items.filter((i) => i.decision === itemFilter);

  return (
    <div>
      <h1 className="text-[34px] leading-tight text-heading sm:text-[58px]">Your decisions:</h1>

      <section
        aria-labelledby="money-heading"
        className="sk sk-panel mt-2 rounded-[44px] px-3 pb-4 pt-3 sm:mt-[11px] sm:rounded-[69px] sm:px-[19px] sm:pb-[18px] sm:pt-[10px]"
      >
        <div className="flex items-start justify-between gap-3 px-3 sm:px-7">
          <h2 id="money-heading" className="text-[30px] leading-tight text-body sm:text-[49px]">
            {title}
          </h2>
          <PeriodPicker years={years} currentYear={currentYear} selected={selected} onSelect={setPeriod} />
        </div>
        <p className="text-center text-deep" data-testid="money-saved">
          <span className="text-[34px] sm:text-[60px]">{money.symbol}</span>
          <span className="break-all text-[46px] leading-none sm:text-[83px]">{money.value}</span>
        </p>
        {hoursSaved !== null && income && (
          <p className="text-center text-lg text-body sm:text-[22px]">
            ≈ {formatWorkTime(hoursSaved, income.hoursPerWeek)} of work you didn’t spend
          </p>
        )}
        <dl className="mt-3 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-[17px]" data-testid="period-stats">
          <StatTile label="Reviewed" value={stats.reviewed} />
          <StatTile label="Bought" value={stats.bought} />
          <StatTile label="Didn’t Buy" value={stats.skipped} />
        </dl>
      </section>

      <section aria-labelledby="history-heading" className="mt-6 sm:mt-[11px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="history-heading" className="text-[34px] leading-tight text-heading sm:text-[58px]">
            History
          </h2>
          <div role="group" aria-label="Show items" className="flex gap-2">
            {ITEM_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={itemFilter === f.value}
                onClick={() => setItemFilter(f.value)}
                className={`sk rounded-[18px] px-3 py-1 text-xl sm:px-4 sm:text-[26px] ${
                  itemFilter === f.value ? "sk-btn text-canvas" : "sk-tile text-body"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {history.items.length === 0 ? (
          <div className="sk sk-tile mt-3 rounded-[37px] px-6 py-8 text-center">
            <p className="text-[28px] text-body">No decisions yet.</p>
            <Link href="/review" className="sk sk-btn mt-4 inline-flex rounded-[20px] px-6 py-2 text-[28px] text-canvas">
              Go to review
            </Link>
          </div>
        ) : shownItems.length === 0 ? (
          <p className="sk sk-tile mt-3 rounded-[37px] px-6 py-8 text-center text-[26px] text-body">
            {itemFilter === "buy" ? "You haven’t bought anything yet." : "Nothing here yet."}
          </p>
        ) : (
          <ul className="mt-3 space-y-[11px]">
            {shownItems.map((item) => (
              <HistoryRow key={item.id} item={item} />
            ))}
          </ul>
        )}

        {history.truncated && (
          <p className="mt-4 text-center text-lg text-muted">
            Showing your {history.items.length.toLocaleString("en-US")} most recent decisions. “All time” totals include everything.
          </p>
        )}
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="sk sk-tile flex flex-col-reverse items-center justify-center rounded-[32px] px-1 py-3 text-center sm:rounded-[69px] sm:py-[18px]">
      <dt className="text-lg leading-tight text-body sm:text-[46px]">{label}</dt>
      <dd className="text-[40px] leading-none text-deep sm:text-[65px]">{value}</dd>
    </div>
  );
}

/** The Figma filter button: choose a year or all time. */
function PeriodPicker({
  years,
  currentYear,
  selected,
  onSelect,
}: {
  years: number[];
  currentYear: number;
  selected: Period;
  onSelect: (period: Period | "current") => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const options: { value: Period; label: string }[] = [
    ...years.map((y) => ({ value: y as Period, label: y === currentYear ? `This year (${y})` : String(y) })),
    { value: "all", label: "All time" },
  ];

  return (
    <div ref={rootRef} className="relative mt-1 shrink-0 sm:mt-[18px]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Choose time period"
        className="sk sk-btn flex h-11 w-[62px] items-center justify-center rounded-full [--sk-w:3px] sm:h-[63px] sm:w-[87px]"
      >
        <img src="/figma/filter-icon.svg" alt="" width={60} height={43} className="w-9 sm:w-[52px]" />
      </button>
      {open && (
        <div
          id={menuId}
          className="sk sk-tile absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-[24px] p-2 shadow-card sm:w-64"
        >
          {options.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={selected === o.value}
              onClick={() => {
                onSelect(o.value === currentYear ? "current" : o.value);
                setOpen(false);
              }}
              className={`block w-full rounded-[14px] px-4 py-2 text-left text-2xl ${
                selected === o.value ? "bg-btn text-canvas" : "text-body hover:bg-canvas"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item }: { item: ItemDTO }) {
  const skipped = item.decision === "skip";
  return (
    <li
      className="sk sk-tile flex items-center gap-3 rounded-[28px] p-2 sm:min-h-[137px] sm:gap-[10px] sm:rounded-[37px] sm:p-[11px] sm:pr-[18px]"
      data-testid="history-item"
    >
      <div className="relative h-[72px] w-[82px] shrink-0 overflow-hidden rounded-[20px] bg-photo sm:h-[116px] sm:w-[132px] sm:rounded-[26px]">
        <Image src={item.imageUrl} alt="" fill sizes="132px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1 self-start">
        <p className="truncate text-2xl leading-tight text-body sm:text-[41px]">{item.name}</p>
        {item.decidedAt && (
          <p className="text-base text-body sm:text-[24px]">
            Reviewed on <LocalDate iso={item.decidedAt} />
          </p>
        )}
      </div>
      <div aria-hidden className="relative hidden h-[60px] w-[90px] shrink-0 md:block">
        <img src="/figma/history-star-1.svg" alt="" width={25} height={24} className="absolute bottom-1 left-0 w-[23px]" />
        <img src="/figma/history-star-2.svg" alt="" width={18} height={17} className="absolute left-[38px] top-0 w-[15px]" />
        <img src="/figma/history-star-3.svg" alt="" width={14} height={13} className="absolute bottom-0 left-[70px] w-[11px]" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:gap-2">
        <p className="text-2xl leading-none text-deep sm:text-[41px]">{formatPrice(item.price, item.currency)}</p>
        <span
          className={`sk rounded-[14px] px-2 text-lg text-deep sm:min-w-[196px] sm:rounded-[18px] sm:px-3 sm:py-1 sm:text-center sm:text-[36px] ${
            skipped ? "sk-badge-skip" : "sk-badge-buy"
          }`}
        >
          {skipped ? "Didn’t Buy" : "Bought"}
        </span>
      </div>
    </li>
  );
}
