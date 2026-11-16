import { getApiUserId } from "@/lib/auth";
import { avatarImagePrefix, deleteImage, getStoredImage } from "@/lib/cloudinary";
import { ALLOWED_IMAGE_FORMATS, MAX_IMAGE_BYTES } from "@/lib/constants";
import { jsonError, jsonOk } from "@/lib/http";
import { removeAvatar, setAvatar } from "@/lib/users";
import { avatarSchema } from "@/lib/validations";
import type { AccountResponse } from "@/types/account";

const deleteQuietly = (publicId: string) =>
  deleteImage(publicId).catch((e) => console.error("Failed to delete image", e));

/** Set the profile picture after a direct upload: body { imagePublicId }. */
export async function PUT(request: Request) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to change your profile picture.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("We couldn't read that request. Please try again.", 400);
  }
  const parsed = avatarSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please choose a photo.", 400);
  const { imagePublicId } = parsed.data;

  // Only profile pictures uploaded with an avatar signature issued to this user.
  if (!imagePublicId.startsWith(avatarImagePrefix(userId))) {
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
    await deleteQuietly(image.publicId);
    return jsonError(formatOk ? "That photo is larger than 5 MB." : "Please use a JPEG, PNG, or WebP image.", 400);
  }

  try {
    const result = await setAvatar(userId, { url: image.secureUrl, publicId: image.publicId });
    if (!result) {
      await deleteQuietly(image.publicId);
      return jsonError("We couldn't find your account.", 404);
    }
    if (result.previousPublicId) await deleteQuietly(result.previousPublicId);
    return jsonOk<AccountResponse>({ account: result.account });
  } catch (error) {
    console.error("Failed to save profile picture", error);
    await deleteQuietly(image.publicId);
    return jsonError("We couldn't save your profile picture. Please try again.", 500);
  }
}

/** Remove the profile picture. */
export async function DELETE() {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to change your profile picture.", 401);
  try {
    const result = await removeAvatar(userId);
    if (!result) return jsonError("We couldn't find your account.", 404);
    if (result.previousPublicId) await deleteQuietly(result.previousPublicId);
    return jsonOk<AccountResponse>({ account: result.account });
  } catch (error) {
    console.error("Failed to remove profile picture", error);
    return jsonError("We couldn't remove your profile picture. Please try again.", 500);
  }
}
