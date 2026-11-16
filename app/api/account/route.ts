import { getApiUserId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getAccount, updateName } from "@/lib/users";
import { accountNameSchema, fieldErrorsOf } from "@/lib/validations";
import type { AccountResponse } from "@/types/account";

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to view your account.", 401);
  try {
    const account = await getAccount(userId);
    return account ? jsonOk<AccountResponse>({ account }) : jsonError("We couldn't find your account.", 404);
  } catch (error) {
    console.error("Failed to load account", error);
    return jsonError("We couldn't load your account. Please try again.", 500);
  }
}

/** Change the display name: body { name }. */
export async function PATCH(request: Request) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to change your account.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("We couldn't read that request. Please try again.", 400);
  }
  const parsed = accountNameSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Please fix the highlighted fields.", 400, { fieldErrors: fieldErrorsOf(parsed.error) });
  }

  try {
    const account = await updateName(userId, parsed.data.name);
    return account ? jsonOk<AccountResponse>({ account }) : jsonError("We couldn't find your account.", 404);
  } catch (error) {
    console.error("Failed to update name", error);
    return jsonError("We couldn't save your name. Please try again.", 500);
  }
}
