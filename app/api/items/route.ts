import { getApiUserId } from "@/lib/auth";
import { deleteImage, getStoredImage, userImagePrefix } from "@/lib/cloudinary";
import { ALLOWED_IMAGE_FORMATS, CURRENCY, MAX_IMAGE_BYTES, WAITING_PERIOD_MS } from "@/lib/constants";
import { jsonError, jsonOk } from "@/lib/http";
import { toItemDTO } from "@/lib/items";
import { connectToDatabase } from "@/lib/mongodb";
import { createItemSchema, fieldErrorsOf } from "@/lib/validations";
import { Item } from "@/models/Item";
import type { CreateItemResponse } from "@/types/api";

export async function POST(request: Request) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to add an item.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("We couldn't read that request. Please try again.", 400);
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Please fix the highlighted fields.", 400, fieldErrorsOf(parsed.error));
  }
  const { name, price, description, imagePublicId } = parsed.data;

  // Only images uploaded with a signature issued to this user are accepted.
  if (!imagePublicId.startsWith(userImagePrefix(userId))) {
    return jsonError("We couldn't find that photo. Please upload it again.", 400);
  }

  let image;
  try {
    image = await getStoredImage(imagePublicId);
  } catch (error) {
    console.error("Failed to look up uploaded image", error);
    return jsonError("We couldn't check your photo right now. Please try again.", 502);
  }
  if (!image) return jsonError("We couldn't find that photo. Please upload it again.", 400);

  // Re-check what Cloudinary actually stored instead of trusting the browser.
  const formatOk = (ALLOWED_IMAGE_FORMATS as readonly string[]).includes(image.format);
  if (!formatOk || image.bytes > MAX_IMAGE_BYTES) {
    await deleteImage(image.publicId).catch((e) => console.error("Failed to delete image", e));
    return jsonError(
      formatOk ? "That photo is larger than 5 MB." : "Please use a JPEG, PNG, or WebP image.",
      400,
    );
  }

  try {
    await connectToDatabase();
    const item = await Item.create({
      userId,
      name,
      price,
      currency: CURRENCY,
      imageUrl: image.secureUrl,
      imagePublicId: image.publicId,
      description,
      availableAt: new Date(Date.now() + WAITING_PERIOD_MS),
      status: "pending",
      decision: null,
      decidedAt: null,
    });
    return jsonOk<CreateItemResponse>({ item: toItemDTO(item) }, 201);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      // Same photo submitted twice; the first request already saved it.
      return jsonError("This item has already been saved.", 409);
    }
    console.error("Failed to create item", error);
    await deleteImage(image.publicId).catch((e) => console.error("Failed to delete image", e));
    return jsonError("We couldn't save your item. Please try again.", 500);
  }
}
