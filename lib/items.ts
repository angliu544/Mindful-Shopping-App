import "server-only";
import type { ItemDocument } from "@/models/Item";
import type { ItemDTO } from "@/types/item";

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
