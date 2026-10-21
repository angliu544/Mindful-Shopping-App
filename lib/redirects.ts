export const DEFAULT_AFTER_SIGN_IN = "/review";

/**
 * Accepts only same-site relative paths ("/history"), so a crafted
 * ?callbackUrl= can't send users to another site after signing in.
 */
export function safeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  if (raw === "/" || raw.startsWith("/sign-in") || raw.startsWith("/sign-up")) return DEFAULT_AFTER_SIGN_IN;
  return raw;
}
