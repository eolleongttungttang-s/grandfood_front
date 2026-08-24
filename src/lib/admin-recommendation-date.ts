import type { MonthlyRecommendation } from "@/lib/admin-monthly-recommendation-api";

const WEEK_MS = 7 * 86_400_000;

export function isDateInRecommendationWeek(date: string, weekStart: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  const start = Date.parse(`${weekStart}T00:00:00Z`);
  return target >= start && target < start + WEEK_MS;
}

export function recommendationForDate(monthly: MonthlyRecommendation | null, date: string) {
  return monthly?.weeks.find((week) =>
    isDateInRecommendationWeek(date, week.week_start_date)
  )?.recommendation ?? null;
}
