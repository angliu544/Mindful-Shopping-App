import { getApiUserId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { changePassword } from "@/lib/users";
import { changePasswordSchema, fieldErrorsOf } from "@/lib/validations";

/** Change the password: body { currentPassword, newPassword, confirmPassword }. */
export async function POST(request: Request) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to change your password.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("We couldn't read that request. Please try again.", 400);
  }
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Please fix the highlighted fields.", 400, { fieldErrors: fieldErrorsOf(parsed.error) });
  }

  try {
    const result = await changePassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
    if (result.ok) return jsonOk({ ok: true });
    if (result.reason === "not_found") return jsonError("We couldn't find your account.", 404);
    const message = "Your current password is incorrect.";
    return jsonError(message, 400, { fieldErrors: { currentPassword: message } });
  } catch (error) {
    // Log only the error type: messages can echo submitted values.
    console.error("Password change failed:", error instanceof Error ? error.name : "unknown error");
    return jsonError("We couldn't change your password. Please try again.", 500);
  }
}
