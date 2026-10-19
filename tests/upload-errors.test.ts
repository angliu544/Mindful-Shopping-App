import { describe, expect, it } from "vitest";
import { describeUploadError } from "@/lib/upload-errors";

describe("describeUploadError", () => {
  it("reports a real format rejection as a format problem", () => {
    expect(describeUploadError(400, "Image file format gif not allowed")).toBe(
      "Please choose a JPEG, PNG, or WebP image.",
    );
  });

  it("does not mistake an invalid signature for a format problem", () => {
    const detail =
      "Invalid Signature 9648c7bd517016526fcdcf. String to sign - 'allowed_formats=jpg,png,webp&public_id=mindful-shopping/u/x&timestamp=1'.";
    expect(describeUploadError(401, detail)).toBe(
      "The photo upload failed (401: Invalid Signature 9648c7bd517016526fcdcf). Please try again.",
    );
  });

  it.each([
    [401, "Invalid api_key abc"],
    [401, "Invalid cloud_name my-app"],
    [403, "Request forbidden due to missing permissions"],
  ])("passes through configuration errors (%d %s)", (status, detail) => {
    expect(describeUploadError(status, detail)).toContain(detail);
  });

  it("reports an oversized file", () => {
    expect(describeUploadError(400, "File size too large. Got 20000000. Maximum is 10485760.")).toMatch(/too large/);
  });
});
