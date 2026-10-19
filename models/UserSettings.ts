import "server-only";
import mongoose, { Schema, type Model } from "mongoose";
import { INCOME_TYPES, type IncomeType } from "@/types/settings";

export interface UserSettingsRecord {
  userId: string;
  incomeType: IncomeType;
  incomeAmount: number;
  hoursPerWeek: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<UserSettingsRecord>(
  {
    userId: { type: String, required: true, unique: true },
    incomeType: { type: String, enum: INCOME_TYPES, required: true },
    incomeAmount: { type: Number, required: true, min: 0 },
    // Only for a salary; hourly pay is used as-is.
    hoursPerWeek: { type: Number, min: 1, max: 100, default: null },
  },
  { timestamps: true },
);

export const UserSettings: Model<UserSettingsRecord> =
  (mongoose.models.UserSettings as Model<UserSettingsRecord> | undefined) ??
  mongoose.model<UserSettingsRecord>("UserSettings", UserSettingsSchema);
