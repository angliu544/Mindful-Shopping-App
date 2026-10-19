import type { IncomeSettingsDTO } from "@/types/settings";

export const DEFAULT_HOURS_PER_WEEK = 40;
const WEEKS_PER_YEAR = 52;
const WORKDAYS_PER_WEEK = 5;
/** Above this many hours, minutes are dropped: "12 hours", not "12 h 4 min". */
const HOURS_AND_MINUTES_LIMIT = 10;

export function hourlyRateOf(settings: IncomeSettingsDTO): number {
  if (settings.incomeType === "hourly") return settings.incomeAmount;
  return settings.hoursPerWeek ? settings.incomeAmount / (WEEKS_PER_YEAR * settings.hoursPerWeek) : 0;
}

/** Hours of work needed to pay `price`, or null if it can't be computed. */
export function workHoursFor(price: number, settings: IncomeSettingsDTO | null): number | null {
  if (!settings || price <= 0) return null;
  const rate = hourlyRateOf(settings);
  return rate > 0 ? price / rate : null;
}

const trimZero = (n: number) => n.toFixed(1).replace(/\.0$/, "");

/**
 * e.g. "45 min", "3 h 20 min", "40 hours". With a salary's hours per week,
 * long durations also show workdays: "26 hours (3.3 workdays)".
 */
export function formatWorkTime(hours: number, hoursPerWeek: number | null): string {
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;

  const workdayHours = hoursPerWeek ? hoursPerWeek / WORKDAYS_PER_WEEK : null;
  if (hours < (workdayHours ?? HOURS_AND_MINUTES_LIMIT)) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  if (!workdayHours) return `${Math.round(hours).toLocaleString("en-US")} hours`;

  const days = hours / workdayHours;
  const dayLabel = days >= 10 ? Math.round(days).toLocaleString("en-US") : trimZero(days);
  return `${Math.round(hours).toLocaleString("en-US")} hours (${dayLabel} ${dayLabel === "1" ? "workday" : "workdays"})`;
}
