import type { ItemDTO } from "@/types/item";

export interface ApiErrorBody {
  error: string;
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
