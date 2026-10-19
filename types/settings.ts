export const INCOME_TYPES = ["hourly", "salary"] as const;
export type IncomeType = (typeof INCOME_TYPES)[number];

/**
 * Income settings as sent to the browser. `incomeAmount` is per hour or per
 * year; `hoursPerWeek` is only set for a salary.
 */
export interface IncomeSettingsDTO {
  incomeType: IncomeType;
  incomeAmount: number;
  hoursPerWeek: number | null;
}

export interface IncomeSettingsResponse {
  settings: IncomeSettingsDTO | null;
}
