import { describeUploadError } from "@/lib/upload-errors";
import type { UploadSignature } from "@/types/api";

/** A failed upload whose message is safe and friendly to show the user. */
export class UploadError extends Error {}

/** Uploads a file straight from the browser to Cloudinary with a server-issued signature. Returns the public id. */
export async function uploadToCloudinary(file: File, sig: UploadSignature): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("public_id", sig.publicId);
  form.append("allowed_formats", sig.allowedFormats);
  form.append("signature", sig.signature);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
  } catch (error) {
    console.error("Cloudinary upload request failed", error);
    throw new UploadError("The photo upload failed. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as { public_id?: string; error?: { message?: string } } | null;
  if (!res.ok || !data?.public_id) {
    const detail = data?.error?.message ?? `HTTP ${res.status}`;
    console.error(`Cloudinary rejected the upload (${res.status}): ${detail}`);
    throw new UploadError(describeUploadError(res.status, detail));
  }
  return data.public_id;
}
