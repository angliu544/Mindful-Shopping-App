import { getApiUserId } from "@/lib/auth";
import { createUploadSignature } from "@/lib/cloudinary";
import { jsonError, jsonOk } from "@/lib/http";

export async function POST() {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to upload a photo.", 401);

  try {
    return jsonOk(createUploadSignature(userId));
  } catch (error) {
    console.error("Failed to sign upload", error);
    return jsonError("Photo uploads aren't available right now. Please try again later.", 500);
  }
}
