import { getApiUserId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { decideItem, undoDecision, type ItemMutationResult } from "@/lib/items";
import { decisionBodySchema, fieldErrorsOf, objectIdSchema } from "@/lib/validations";
import type { ApiErrorCode, ItemResponse } from "@/types/api";

type Context = RouteContext<"/api/items/[id]/decision">;

const failure: Record<ApiErrorCode, [status: number, message: string]> = {
  not_found: [404, "We couldn't find that item."],
  already_reviewed: [409, "You've already decided on this item."],
  not_ready: [409, "This item isn't ready for review yet."],
};

function respond(result: ItemMutationResult) {
  if (result.ok) return jsonOk<ItemResponse>({ item: result.item });
  const [status, message] = failure[result.reason];
  return jsonError(message, status, { code: result.reason });
}

/** Record a decision: body { decision: "buy" | "skip" }. */
export async function POST(request: Request, ctx: Context) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to review items.", 401);

  const id = objectIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return jsonError("We couldn't find that item.", 404, { code: "not_found" });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("We couldn't read that request. Please try again.", 400);
  }
  const parsed = decisionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Decision must be "buy" or "skip".', 400, { fieldErrors: fieldErrorsOf(parsed.error) });
  }

  try {
    return respond(await decideItem(userId, id.data, parsed.data.decision));
  } catch (error) {
    console.error("Failed to record decision", error);
    return jsonError("We couldn't save your decision. Please try again.", 500);
  }
}

/** Undo a decision, returning the item to the review queue. */
export async function DELETE(_request: Request, ctx: Context) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to review items.", 401);

  const id = objectIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return jsonError("We couldn't find that item.", 404, { code: "not_found" });

  try {
    return respond(await undoDecision(userId, id.data));
  } catch (error) {
    console.error("Failed to undo decision", error);
    return jsonError("We couldn't undo that. Please try again.", 500);
  }
}
