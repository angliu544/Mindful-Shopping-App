import { getApiUserId } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { clearIncomeSettings, getIncomeSettings, saveIncomeSettings } from "@/lib/settings";
import { fieldErrorsOf, incomeSettingsSchema } from "@/lib/validations";
import type { IncomeSettingsResponse } from "@/types/settings";

export async function GET() {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to view your settings.", 401);
  try {
    return jsonOk<IncomeSettingsResponse>({ settings: await getIncomeSettings(userId) });
  } catch (error) {
    console.error("Failed to load settings", error);
    return jsonError("We couldn't load your settings. Please try again.", 500);
  }
}

export async function PUT(request: Request) {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to save your settings.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("We couldn't read that request. Please try again.", 400);
  }
  const parsed = incomeSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Please fix the highlighted fields.", 400, { fieldErrors: fieldErrorsOf(parsed.error) });
  }

  try {
    return jsonOk<IncomeSettingsResponse>({ settings: await saveIncomeSettings(userId, parsed.data) });
  } catch (error) {
    console.error("Failed to save settings", error);
    return jsonError("We couldn't save your settings. Please try again.", 500);
  }
}

export async function DELETE() {
  const userId = await getApiUserId();
  if (!userId) return jsonError("Please sign in to change your settings.", 401);
  try {
    await clearIncomeSettings(userId);
    return jsonOk<IncomeSettingsResponse>({ settings: null });
  } catch (error) {
    console.error("Failed to clear settings", error);
    return jsonError("We couldn't remove your income. Please try again.", 500);
  }
}
