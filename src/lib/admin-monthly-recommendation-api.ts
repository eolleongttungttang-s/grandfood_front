import { getJson, patchJson, postJson } from "@/lib/api";
import { DEMO_RESIDENT_ID } from "@/lib/admin-residents";

export type RecommendationGenerationStatus = "not_started" | "generating" | "done" | "failed";
export type FacilityMealType = "breakfast" | "lunch" | "dinner";
export type DailyReviewStatus = "pending" | "confirmed" | "rejected";

export type MealStaple = {
  name: string;
  category: string;
  calorie_per_100g: number | null;
  protein_per_100g: number | null;
  sodium_per_100g: number | null;
  carbs_per_100g: number | null;
};

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
    review_status: DailyReviewStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    meals: Array<{
      meal_type: FacilityMealType;
      staple: MealStaple | null;
      items: RecommendationItem[];
    }>;
  }> | null;
};

export type DailyReviewResponse = {
  user_id: string;
  service_date: string;
  status: DailyReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
};

export type DishCatalogItem = {
  id: string;
  storeId: string;
  name: string;
  category: string;
  kcal: number | null;
  sodiumMg: number | null;
  proteinG: number | null;
};

export async function fetchMonthlyRecommendation(userId: string, month: string) {
  if (userId === DEMO_RESIDENT_ID) {
    const catalog = await fetchBanchanCatalog();
    const demoExcludedKeywords = ["가지", "우유", "땅콩"];
    const allSideDishes = catalog.filter((dish) =>
      dish.category !== "밥류"
      && !demoExcludedKeywords.some((keyword) => dish.name.includes(keyword))
    );
    const lowSodiumDishes = allSideDishes
      .filter((dish) => dish.sodiumMg !== null && dish.sodiumMg <= 300)
      .sort((a, b) => (a.sodiumMg ?? 0) - (b.sodiumMg ?? 0));
    const sideDishes = lowSodiumDishes.length >= 6
      ? lowSodiumDishes
      : [...allSideDishes].sort((a, b) => (a.sodiumMg ?? Number.MAX_SAFE_INTEGER) - (b.sodiumMg ?? Number.MAX_SAFE_INTEGER));
    const rice = catalog.find((dish) => dish.category === "밥류") ?? null;
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const days: NonNullable<MonthlyRecommendation["days"]> = Array.from({ length: lastDay }, (_, dayIndex) => {
      const serviceDate = `${month}-${String(dayIndex + 1).padStart(2, "0")}`;
      return {
        service_date: serviceDate,
        review_status: dayIndex < 20 ? "confirmed" : "pending",
        reviewed_by: dayIndex < 20 ? "demo-staff" : null,
        reviewed_at: dayIndex < 20 ? `${serviceDate}T15:00:00+09:00` : null,
        meals: (["breakfast", "lunch", "dinner"] as FacilityMealType[]).map((mealType, mealIndex) => ({
          meal_type: mealType,
          staple: rice ? {
            name: rice.name,
            category: rice.category,
            calorie_per_100g: rice.kcal,
            protein_per_100g: rice.proteinG,
            sodium_per_100g: rice.sodiumMg,
            carbs_per_100g: null,
          } : null,
          items: Array.from({ length: 3 }, (_, slotIndex) => {
            const dish = sideDishes[(dayIndex * 9 + mealIndex * 3 + slotIndex) % Math.max(sideDishes.length, 1)];
            const item: RecommendationItem | null = dish ? {
              banchan_id: dish.id,
              name: dish.name,
              name_en: null,
              category: dish.category,
              calorie_per_100g: dish.kcal,
              protein_per_100g: dish.proteinG,
              sodium_per_100g: dish.sodiumMg,
              carbs_per_100g: null,
              slot_index: slotIndex + 1,
              suitability: "recommended" as const,
              reason: "대상자의 건강 프로필과 영양 목표를 고려한 예시 배정입니다.",
              service_date: serviceDate,
              meal_type: mealType,
            } : null;
            return item;
          }).filter((item): item is RecommendationItem => item !== null),
        })),
      };
    });
    const weekStarts = [...new Set(days.map((day) => {
      const date = new Date(`${day.service_date}T12:00:00`);
      const offset = (date.getDay() + 6) % 7;
      date.setDate(date.getDate() - offset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }))];
    return {
      user_id: userId,
      month,
      weeks: weekStarts.map((weekStart, index) => ({
        week_start_date: weekStart,
        generation_status: "done",
        error: null,
        recommendation: {
          id: `demo-week-${index}`,
          target_calorie_kcal: 1800,
          target_protein_g: 60,
          target_sodium_mg: 2000,
          target_carbs_g: 280,
        },
      })),
      days,
    } satisfies MonthlyRecommendation;
  }
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

export function fetchBanchanCatalog() {
  return getJson<DishCatalogItem[]>("/stores/admin-web/dishes");
}

export function replaceFacilityRecommendationItem(
  userId: string,
  serviceDate: string,
  mealType: FacilityMealType,
  slotIndex: number,
  replacementBanchanId: string,
) {
  return patchJson<unknown>(
    `/health/users/${userId}/banchan-recommendations/${serviceDate}/${mealType}/items/${slotIndex}`,
    { replacement_banchan_id: replacementBanchanId },
  );
}

export function updateDailyReviewStatus(
  userId: string,
  serviceDate: string,
  status: DailyReviewStatus,
) {
  return patchJson<DailyReviewResponse>(
    `/health/users/${userId}/banchan-recommendations/daily/${serviceDate}/review`,
    { status },
  );
}
