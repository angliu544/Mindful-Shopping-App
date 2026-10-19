/**
 * Turns a failed Cloudinary upload response into a message for the user.
 * Match Cloudinary's specific wording: other errors (e.g. "Invalid Signature")
 * quote the signed parameters, which include "allowed_formats".
 */
export function describeUploadError(status: number, detail: string): string {
  if (/^Image file format \S+ not allowed/i.test(detail)) return "Please choose a JPEG, PNG, or WebP image.";
  if (/^File size too large/i.test(detail)) return "That photo is too large. Please choose a smaller one.";
  // Cloudinary's reason (e.g. "Invalid Signature", "Invalid cloud_name") contains no
  // secrets and is what you need to fix a misconfigured deployment.
  const reason = detail.split(". String to sign")[0].slice(0, 80);
  return `The photo upload failed (${status}: ${reason}). Please try again.`;
}
