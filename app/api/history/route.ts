import { getApiUserId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getHistory } from "@/lib/items";
import type { HistoryResponse } from "@/types/api";

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to view your history.", 401);

  try {
    return jsonOk<HistoryResponse>(await getHistory(userId));
  } catch (error) {
    console.error("Failed to load history", error);
    return jsonError("We couldn't load your history. Please try again.", 500);
  }
}
