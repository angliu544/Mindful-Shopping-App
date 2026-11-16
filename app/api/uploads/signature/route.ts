import { getApiUserId } from "@/lib/auth";
import { createUploadSignature } from "@/lib/cloudinary";
import { jsonError, jsonOk } from "@/lib/http";

/** Signs one direct upload. `?purpose=avatar` signs a profile picture instead of an item photo. */
export async function POST(request: Request) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to upload a photo.", 401);

  const purpose = new URL(request.url).searchParams.get("purpose") === "avatar" ? "avatar" : "item";
  try {
    return jsonOk(createUploadSignature(userId, purpose));
  } catch (error) {
    console.error("Failed to sign upload", error);
    return jsonError("Photo uploads aren't available right now. Please try again later.", 500);
  }
}
