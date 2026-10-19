import "server-only";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { ALLOWED_IMAGE_FORMATS } from "@/lib/constants";
import type { UploadSignature } from "@/types/api";

const ROOT_FOLDER = "mindful-shopping";

function getConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return { cloudName: CLOUDINARY_CLOUD_NAME, apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET };
}

/** Every image a user uploads lives under this public ID prefix. */
export function userImagePrefix(userId: string): string {
  return `${ROOT_FOLDER}/${userId}/`;
}

/**
 * Signs a direct browser upload. The public ID is chosen here, so the browser
 * can only upload to a fresh location inside the user's own folder, and
 * Cloudinary rejects formats other than jpg/png/webp. Signatures expire after
 * one hour (enforced by Cloudinary). The API secret never leaves the server.
 */
export function createUploadSignature(userId: string): UploadSignature {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `${userImagePrefix(userId)}${randomUUID()}`;
  const allowedFormats = ALLOWED_IMAGE_FORMATS.join(",");

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, public_id: publicId, allowed_formats: allowedFormats },
    apiSecret,
  );

  return { cloudName, apiKey, timestamp, publicId, allowedFormats, signature };
}

export type StoredImage = {
  publicId: string;
  secureUrl: string;
  bytes: number;
  format: string;
};

/** Looks up an uploaded image on Cloudinary. Returns null if it doesn't exist. */
export async function getStoredImage(publicId: string): Promise<StoredImage | null> {
  getConfig();
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return {
      publicId: resource.public_id,
      secureUrl: resource.secure_url,
      bytes: resource.bytes,
      format: resource.format,
    };
  } catch (error) {
    if ((error as { error?: { http_code?: number } })?.error?.http_code === 404) return null;
    throw error;
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  getConfig();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}
