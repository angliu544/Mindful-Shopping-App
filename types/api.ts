import type { ItemDTO } from "@/types/item";

export type ApiErrorCode = "not_found" | "already_reviewed" | "not_ready";

export interface ApiErrorBody {
  error: string;
  code?: ApiErrorCode;
  fieldErrors?: Record<string, string>;
}

/** Parameters the browser needs for a signed, direct upload to Cloudinary. */
export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  publicId: string;
  allowedFormats: string;
  signature: string;
}

export interface CreateItemResponse {
  item: ItemDTO;
}

export interface ReviewQueueResponse {
  items: ItemDTO[];
  /** When the next still-waiting item becomes reviewable, if any. */
  nextAvailableAt: string | null;
}

export interface ItemResponse {
  item: ItemDTO;
}
