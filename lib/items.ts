import "server-only";
import { WAITING_PERIOD_MS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/mongodb";
import { Item, type ItemDocument } from "@/models/Item";
import type { ApiErrorCode, HistoryResponse, ReviewQueueResponse } from "@/types/api";
import type { ItemDecision, ItemDTO } from "@/types/item";

// Every query in this file is scoped by the caller's Auth.js userId, which must
// come from the server-side session, never from the request body.

const REVIEW_QUEUE_LIMIT = 100;
const HISTORY_LIMIT = 500;

const roundCents = (n: number) => Math.round(n * 100) / 100;

/**
 * 24 hours, unless the WAITING_PERIOD_SECONDS env var sets another wait
 * (e.g. 0 for a demo deployment). Invalid values fall back to 24 hours.
 */
export function getWaitingPeriodMs(): number {
  const raw = process.env.WAITING_PERIOD_SECONDS?.trim();
  const seconds = Number(raw);
  if (raw && Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  return WAITING_PERIOD_MS;
}

/** Converts a Mongoose document into a plain object safe to send to the browser. */
export function toItemDTO(doc: ItemDocument): ItemDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    price: doc.price,
    currency: doc.currency,
    imageUrl: doc.imageUrl,
    description: doc.description ?? null,
    availableAt: doc.availableAt.toISOString(),
    status: doc.status,
    decision: doc.decision,
    decidedAt: doc.decidedAt ? doc.decidedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Pending items whose waiting period is over, oldest first. */
export async function getReviewQueue(userId: string): Promise<ReviewQueueResponse> {
  await connectToDatabase();
  const now = new Date();
  const [ready, next] = await Promise.all([
    Item.find({ userId, status: "pending", availableAt: { $lte: now } })
      .sort({ availableAt: 1, _id: 1 })
      .limit(REVIEW_QUEUE_LIMIT),
    Item.findOne({ userId, status: "pending", availableAt: { $gt: now } })
      .sort({ availableAt: 1 })
      .select("availableAt"),
  ]);
  return {
    items: ready.map(toItemDTO),
    nextAvailableAt: next ? next.availableAt.toISOString() : null,
  };
}

export type ItemMutationResult =
  | { ok: true; item: ItemDTO }
  | { ok: false; reason: ApiErrorCode };

/**
 * Records a decision in a single atomic update that only matches when the item
 * belongs to the user, is still pending, and is already available. Concurrent
 * or repeated requests can therefore succeed at most once.
 */
export async function decideItem(
  userId: string,
  itemId: string,
  decision: ItemDecision,
): Promise<ItemMutationResult> {
  await connectToDatabase();
  const now = new Date();

  const item = await Item.findOneAndUpdate(
    { _id: itemId, userId, status: "pending", availableAt: { $lte: now } },
    { $set: { status: "reviewed", decision, decidedAt: now } },
    { returnDocument: "after" },
  );
  if (item) return { ok: true, item: toItemDTO(item) };

  // Explain the miss. Another user's item looks exactly like a missing one.
  const existing = await Item.findOne({ _id: itemId, userId }).select("status");
  if (!existing) return { ok: false, reason: "not_found" };
  return { ok: false, reason: existing.status === "reviewed" ? "already_reviewed" : "not_ready" };
}

/** Puts a reviewed item back in the queue (undo). */
export async function undoDecision(userId: string, itemId: string): Promise<ItemMutationResult> {
  await connectToDatabase();
  const item = await Item.findOneAndUpdate(
    { _id: itemId, userId, status: "reviewed" },
    { $set: { status: "pending", decision: null, decidedAt: null } },
    { returnDocument: "after" },
  );
  return item ? { ok: true, item: toItemDTO(item) } : { ok: false, reason: "not_found" };
}

/**
 * The user's reviewed items plus totals. Totals are aggregated in MongoDB over
 * every reviewed item, so they stay correct even when the list is capped.
 */
export async function getHistory(userId: string): Promise<HistoryResponse> {
  await connectToDatabase();
  const filter = { userId, status: "reviewed" as const };
  const [items, groups] = await Promise.all([
    Item.find(filter).sort({ decidedAt: -1, _id: -1 }).limit(HISTORY_LIMIT + 1),
    Item.aggregate<{ _id: ItemDecision; count: number; total: number }>([
      { $match: filter },
      { $group: { _id: "$decision", count: { $sum: 1 }, total: { $sum: "$price" } } },
    ]),
  ]);

  const buy = groups.find((g) => g._id === "buy");
  const skip = groups.find((g) => g._id === "skip");
  const bought = buy?.count ?? 0;
  const skipped = skip?.count ?? 0;

  return {
    items: items.slice(0, HISTORY_LIMIT).map(toItemDTO),
    stats: {
      reviewed: bought + skipped,
      bought,
      skipped,
      moneySaved: roundCents(skip?.total ?? 0),
      moneySpent: roundCents(buy?.total ?? 0),
    },
    truncated: items.length > HISTORY_LIMIT,
  };
}

/**
 * "Need More Time": pushes a ready item back by one waiting period (24 hours
 * unless WAITING_PERIOD_SECONDS says otherwise). Like a decision, it only
 * matches the user's own pending, already-available item, so a double tap
 * can't stack extra days.
 */
export async function snoozeItem(userId: string, itemId: string): Promise<ItemMutationResult> {
  await connectToDatabase();
  const now = new Date();

  const item = await Item.findOneAndUpdate(
    { _id: itemId, userId, status: "pending", availableAt: { $lte: now } },
    { $set: { availableAt: new Date(now.getTime() + getWaitingPeriodMs()) } },
    { returnDocument: "after" },
  );
  if (item) return { ok: true, item: toItemDTO(item) };

  const existing = await Item.findOne({ _id: itemId, userId }).select("status");
  if (!existing) return { ok: false, reason: "not_found" };
  return { ok: false, reason: existing.status === "reviewed" ? "already_reviewed" : "not_ready" };
}
