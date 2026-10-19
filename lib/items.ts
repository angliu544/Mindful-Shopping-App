import "server-only";
import { WAITING_PERIOD_MS } from "@/lib/constants";
import type { ItemDocument } from "@/models/Item";
import type { ItemDTO } from "@/types/item";

/**
 * 24 hours, unless WAITING_PERIOD_SECONDS is set in development so the review
 * flow can be tested without waiting a day. Ignored in production builds.
 */
export function getWaitingPeriodMs(): number {
  const raw = process.env.WAITING_PERIOD_SECONDS;
  const seconds = Number(raw);
  if (process.env.NODE_ENV !== "production" && raw && Number.isFinite(seconds) && seconds >= 0) {
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
