import { getJson } from "@/lib/api";

export type NutrientActual = {
  nutrient_type: string;
  amount: number;
  target_amount: number | null;
  fulfillment_pct: number | null;
};

export type DailyNutritionActuals = {
  elder_id: string;
  date: string;
  nutrients: NutrientActual[];
};

export function fetchDailyNutritionActuals(elderId: string, date: string) {
  return getJson<DailyNutritionActuals>(
    `/app/elder/${encodeURIComponent(elderId)}/nutrition-actuals?date=${encodeURIComponent(date)}`,
  );
}

export function nutrientActual(
  actuals: DailyNutritionActuals | null | undefined,
  nutrientType: "calorie" | "protein" | "sodium",
) {
  return actuals?.nutrients.find((item) => item.nutrient_type === nutrientType) ?? null;
}
