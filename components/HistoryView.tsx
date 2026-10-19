import Image from "next/image";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import LocalDate from "@/components/LocalDate";
import { formatPrice } from "@/lib/format";
import { formatWorkTime, workHoursFor } from "@/lib/income";
import type { HistoryResponse } from "@/types/api";
import type { ItemDecision, ItemDTO } from "@/types/item";
import type { IncomeSettingsDTO } from "@/types/settings";

const decisionLabel: Record<ItemDecision, string> = { buy: "Buy", skip: "Do Not Buy" };

export default function HistoryView({
  history,
  income,
}: {
  history: HistoryResponse;
  income: IncomeSettingsDTO | null;
}) {
  const { stats, items, truncated } = history;

  if (stats.reviewed === 0) {
    return (
      <EmptyState
        title="No decisions yet"
        actions={
          <Link href="/review" className="rounded-full bg-sage-600 px-6 py-3 font-medium text-white hover:bg-sage-700">
            Go to review
          </Link>
        }
      >
        <p>Once you decide on an item, it shows up here along with what you&apos;ve saved.</p>
      </EmptyState>
    );
  }

  const skipped = items.filter((i) => i.decision === "skip");
  const bought = items.filter((i) => i.decision === "buy");
  const hoursSaved = workHoursFor(stats.moneySaved, income);

  return (
    <div className="space-y-8">
      <section aria-labelledby="totals-heading" className="space-y-3">
        <h2 id="totals-heading" className="sr-only">
          Totals
        </h2>
        <div className="rounded-3xl bg-sage-600 px-6 py-6 text-white">
          <p className="text-sm font-medium text-white/80">Money saved</p>
          <p className="mt-1 font-serif text-4xl font-semibold" data-testid="money-saved">
            {formatPrice(stats.moneySaved)}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {hoursSaved !== null && income
              ? `≈ ${formatWorkTime(hoursSaved, income.hoursPerWeek)} of work you didn't spend`
              : `From ${stats.skipped} ${stats.skipped === 1 ? "item" : "items"} you let go`}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Reviewed" value={stats.reviewed} />
          <Stat label="Bought" value={stats.bought} />
          <Stat label="Didn't buy" value={stats.skipped} />
        </dl>
      </section>

      <ItemSection title="Do Not Buy" items={skipped} total={stats.skipped} />
      <ItemSection title="Buy" items={bought} total={stats.bought} />

      {truncated && (
        <p className="text-center text-sm text-ink-muted">
          Showing your 500 most recent decisions. Totals include everything.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sage-100 bg-paper px-2 py-3">
      <dd className="text-2xl font-semibold text-ink">{value}</dd>
      <dt className="text-xs text-ink-muted sm:text-sm">{label}</dt>
    </div>
  );
}

function ItemSection({ title, items, total }: { title: string; items: ItemDTO[]; total: number }) {
  const id = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="flex items-baseline justify-between font-serif text-xl font-semibold">
        {title}
        <span className="font-sans text-sm font-normal text-ink-muted">
          {total} {total === 1 ? "item" : "items"}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-sage-200 px-4 py-6 text-center text-sm text-ink-muted">
          Nothing here yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-sage-100 overflow-hidden rounded-2xl border border-sage-100 bg-paper">
          {items.map((item) => (
            <HistoryRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryRow({ item }: { item: ItemDTO }) {
  const skipped = item.decision === "skip";
  return (
    <li className="flex items-center gap-3 p-3" data-testid="history-item">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sage-50">
        <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{item.name}</p>
        <p className="text-sm text-ink-muted">
          {item.decidedAt && (
            <>
              Reviewed <LocalDate iso={item.decidedAt} />
            </>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-ink">{formatPrice(item.price, item.currency)}</p>
        {item.decision && (
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              skipped ? "bg-sage-100 text-sage-700" : "bg-cream text-ink-muted ring-1 ring-sage-200"
            }`}
          >
            {decisionLabel[item.decision]}
          </span>
        )}
      </div>
    </li>
  );
}
