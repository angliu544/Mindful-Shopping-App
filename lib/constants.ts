export const WAITING_PERIOD_MS = 24 * 60 * 60 * 1000;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const ITEM_NAME_MAX_LENGTH = 100;
export const ITEM_DESCRIPTION_MAX_LENGTH = 500;
/** Cloudinary format names matching ALLOWED_IMAGE_TYPES. */
export const ALLOWED_IMAGE_FORMATS = ["jpg", "png", "webp"] as const;

export const MAX_PRICE = 1_000_000;
export const CURRENCY = "USD";
