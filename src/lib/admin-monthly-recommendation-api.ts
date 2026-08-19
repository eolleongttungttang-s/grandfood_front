import { getJson, postJson } from "@/lib/api";

export type RecommendationGenerationStatus = "not_started" | "generating" | "done" | "failed";
export type FacilityMealType = "breakfast" | "lunch" | "dinner";

export type RecommendationItem = {
  banchan_id: string;
  name: string;
  name_en: string | null;
  category: string;
  calorie_per_100g: number | null;
  protein_per_100g: number | null;
  sodium_per_100g: number | null;
  carbs_per_100g: number | null;
  slot_index: number;
  suitability: "recommended" | "caution" | "avoid";
  reason: string | null;
  service_date: string | null;
  meal_type: FacilityMealType | null;
};

export type MonthlyRecommendation = {
  user_id: string;
  month: string;
  weeks: Array<{
    week_start_date: string;
    generation_status: RecommendationGenerationStatus;
    error: string | null;
    recommendation: null | {
      id: string;
      target_calorie_kcal: number | null;
      target_protein_g: number | null;
      target_sodium_mg: number | null;
      target_carbs_g: number | null;
    };
  }>;
  days: Array<{
    service_date: string;
    meals: Array<{ meal_type: FacilityMealType; items: RecommendationItem[] }>;
  }> | null;
};

export function fetchMonthlyRecommendation(userId: string, month: string) {
  return getJson<MonthlyRecommendation>(
    `/health/users/${userId}/banchan-recommendations/monthly/${month}`,
  );
}

export function generateMonthlyRecommendation(userId: string, month: string, force: boolean) {
  return postJson<MonthlyRecommendation>(
    `/health/users/${userId}/banchan-recommendations/monthly`,
    { month, force },
  );
}
