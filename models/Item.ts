import "server-only";
import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import { CURRENCY, ITEM_DESCRIPTION_MAX_LENGTH, ITEM_NAME_MAX_LENGTH } from "@/lib/constants";
import { ITEM_DECISIONS, ITEM_STATUSES, type ItemRecord } from "@/types/item";

const ItemSchema = new Schema<ItemRecord>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: ITEM_NAME_MAX_LENGTH },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: CURRENCY },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, required: true, unique: true },
    description: { type: String, trim: true, maxlength: ITEM_DESCRIPTION_MAX_LENGTH },
    // Stored as a BSON Date, which is always UTC.
    availableAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ITEM_STATUSES, default: "pending", index: true },
    decision: { type: String, enum: [...ITEM_DECISIONS, null], default: null },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Review queue: { userId, status: "pending", availableAt: { $lte: now } }
ItemSchema.index({ userId: 1, status: 1, availableAt: 1 });
// History, newest decisions first.
ItemSchema.index({ userId: 1, status: 1, decidedAt: -1 });

export type ItemDocument = HydratedDocument<ItemRecord>;

// Reuse the compiled model across hot reloads.
export const Item: Model<ItemRecord> =
  (mongoose.models.Item as Model<ItemRecord> | undefined) ??
  mongoose.model<ItemRecord>("Item", ItemSchema);
