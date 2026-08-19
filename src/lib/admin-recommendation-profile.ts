import type { ActivityLevel, ConditionFlag } from "@/lib/admin-ward-registration";

const STORAGE_KEY = "grandfood_admin_recommendation_profiles";

export type AdminRecommendationProfile = {
  checkupDate: string;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  conditionFlags: ConditionFlag[];
  conditionsNote: string;
  allergies: string[];
  dislikedIngredients: string[];
  restrictions: string[];
  medications: { name: string; schedule: string }[];
  mealsPerDay: 1 | 2 | 3 | 4 | null;
  chewingDifficulty: boolean | null;
  mobilityLevel: "independent" | "needs_assistance" | "bedridden" | null;
};

export function saveAdminRecommendationProfile(
  residentId: string,
  profile: AdminRecommendationProfile,
) {
  const profiles = readAllProfiles();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profiles, [residentId]: profile }));
}

export function readAdminRecommendationProfile(
  residentId: string,
): AdminRecommendationProfile | null {
  return readAllProfiles()[residentId] ?? null;
}

export function updateAdminRecommendationProfile(
  residentId: string,
  changes: Partial<AdminRecommendationProfile>,
) {
  const current = readAdminRecommendationProfile(residentId);
  saveAdminRecommendationProfile(residentId, {
    checkupDate: "-",
    heightCm: null,
    weightKg: null,
    activityLevel: null,
    conditionFlags: [],
    conditionsNote: "",
    allergies: [],
    dislikedIngredients: [],
    restrictions: [],
    medications: [],
    mealsPerDay: null,
    chewingDifficulty: null,
    mobilityLevel: null,
    ...current,
    ...changes,
  });
}

function readAllProfiles(): Record<string, AdminRecommendationProfile> {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as Record<string, AdminRecommendationProfile>) : {};
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}
