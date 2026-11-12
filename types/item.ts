import type { ReflectionResponse } from "@/lib/reflection";

export const ITEM_STATUSES = ["pending", "reviewed"] as const;
export const ITEM_DECISIONS = ["buy", "skip"] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemDecision = (typeof ITEM_DECISIONS)[number];

/** Shape of an Item document as stored in MongoDB. */
export interface ItemRecord {
  userId: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  imagePublicId: string;
  description?: string;
  availableAt: Date;
  status: ItemStatus;
  decision: ItemDecision | null;
  decidedAt: Date | null;
  /** Set only when the user finished the reflection chatbot before deciding. */
  reflectionResponses: ReflectionResponse[];
  reflectionScore: number | null;
  reflectionCompleted: boolean;
  reflectionCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReflectionDTO {
  score: number;
  responses: ReflectionResponse[];
  completedAt: string;
}

/** Serializable item sent to Client Components. Dates are ISO 8601 UTC strings. */
export interface ItemDTO {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  description: string | null;
  availableAt: string;
  status: ItemStatus;
  decision: ItemDecision | null;
  decidedAt: string | null;
  /** Null unless the reflection was completed. */
  reflection: ReflectionDTO | null;
  createdAt: string;
}
