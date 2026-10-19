import { z } from "zod";
import {
  ALLOWED_IMAGE_TYPES,
  ITEM_DESCRIPTION_MAX_LENGTH,
  ITEM_NAME_MAX_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_PRICE,
} from "@/lib/constants";

// Shared by the upload form and the API so both give the same messages.

export const itemFieldsSchema = z.object({
  name: z
    .string({ error: "Please give the item a name." })
    .trim()
    .min(1, "Please give the item a name.")
    .max(ITEM_NAME_MAX_LENGTH, `Keep the name under ${ITEM_NAME_MAX_LENGTH} characters.`),
  price: z
    .number({ error: "Please enter a price, like 24.99." })
    .nonnegative("Price can't be negative.")
    .max(MAX_PRICE, "That price looks too high. Please check it.")
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use at most two decimal places.")
    .transform((v) => Math.round(v * 100) / 100),
  description: z
    .string()
    .trim()
    .max(
      ITEM_DESCRIPTION_MAX_LENGTH,
      `Keep the description under ${ITEM_DESCRIPTION_MAX_LENGTH} characters.`,
    )
    .optional()
    .transform((v) => v || undefined),
});

// Unknown keys (userId, status, decision, imageUrl, ...) are stripped.
export const createItemSchema = itemFieldsSchema.extend({
  imagePublicId: z.string({ error: "Please add a photo." }).min(1, "Please add a photo.").max(255),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

/** First error message per field, for showing next to inputs. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const { fieldErrors } = z.flattenError(error);
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const first = (messages as string[] | undefined)?.[0];
    if (first) result[field] = first;
  }
  return result;
}

/** Returns a friendly error, or null if the file is acceptable. */
export function validateImageFile(file: { type: string; size: number } | null): string | null {
  if (!file) return "Please add a photo of the item.";
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Please choose a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) return "That photo is larger than 5 MB. Please choose a smaller one.";
  return null;
}

/** Parses user-typed prices like "$1,299.50". Returns NaN for empty or invalid input. */
export function parsePriceInput(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") return Number.NaN;
  return Number(cleaned);
}
