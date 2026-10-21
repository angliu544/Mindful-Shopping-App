import { getApiUserId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { snoozeItem } from "@/lib/items";
import { objectIdSchema } from "@/lib/validations";
import type { ItemResponse } from "@/types/api";

const failure = {
  not_found: [404, "We couldn't find that item."],
  already_reviewed: [409, "You've already decided on this item."],
  // Already snoozed (e.g. a double tap or another tab): it's waiting again.
  not_ready: [409, "This item is already waiting for later."],
} as const;

/** "Need More Time": the item comes back after another waiting period. */
export async function POST(_request: Request, ctx: RouteContext<"/api/items/[id]/snooze">) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to review items.", 401);

  const id = objectIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return jsonError("We couldn't find that item.", 404, { code: "not_found" });

  try {
    const result = await snoozeItem(userId, id.data);
    if (result.ok) return jsonOk<ItemResponse>({ item: result.item });
    const [status, message] = failure[result.reason];
    return jsonError(message, status, { code: result.reason });
  } catch (error) {
    console.error("Failed to snooze item", error);
    return jsonError("We couldn't save that. Please try again.", 500);
  }
}
