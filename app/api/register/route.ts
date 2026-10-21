import { jsonError, jsonOk } from "@/lib/http";
import { registerUser } from "@/lib/users";
import { fieldErrorsOf, registerSchema } from "@/lib/validations";

/** Creates an email/password account. Responds with the public user only, never the hash. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("We couldn't read that request. Please try again.", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Please fix the highlighted fields.", 400, { fieldErrors: fieldErrorsOf(parsed.error) });
  }

  try {
    const result = await registerUser(parsed.data);
    if (!result.ok) {
      const message = "An account with this email already exists. Try signing in instead.";
      return jsonError(message, 409, { fieldErrors: { email: message } });
    }
    const { id, name, email } = result.user;
    return jsonOk({ user: { id, name, email } }, 201);
  } catch (error) {
    // Log only the error type: messages can echo submitted values.
    console.error("Registration failed:", error instanceof Error ? error.name : "unknown error");
    return jsonError("We couldn't create your account. Please try again.", 500);
  }
}
