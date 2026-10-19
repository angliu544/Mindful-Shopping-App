import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import type { IncomeSettingsInput } from "@/lib/validations";
import { UserSettings, type UserSettingsRecord } from "@/models/UserSettings";
import type { IncomeSettingsDTO } from "@/types/settings";

// Scoped by the caller's Clerk userId from the server-side session.

function toDTO(doc: Pick<UserSettingsRecord, "incomeType" | "incomeAmount" | "hoursPerWeek">): IncomeSettingsDTO {
  return {
    incomeType: doc.incomeType,
    incomeAmount: doc.incomeAmount,
    // Older hourly records may still carry a week length; it no longer applies.
    hoursPerWeek: doc.incomeType === "salary" ? doc.hoursPerWeek : null,
  };
}

export async function getIncomeSettings(userId: string): Promise<IncomeSettingsDTO | null> {
  await connectToDatabase();
  const doc = await UserSettings.findOne({ userId }).lean();
  return doc ? toDTO(doc) : null;
}

export async function saveIncomeSettings(userId: string, input: IncomeSettingsInput): Promise<IncomeSettingsDTO> {
  await connectToDatabase();
  const doc = await UserSettings.findOneAndUpdate(
    { userId },
    { $set: input, $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
  return toDTO(doc!);
}

export async function clearIncomeSettings(userId: string): Promise<void> {
  await connectToDatabase();
  await UserSettings.deleteOne({ userId });
}
