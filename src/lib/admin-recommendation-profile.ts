import type { ActivityLevel, ConditionFlag } from "@/lib/admin-ward-registration";

const STORAGE_KEY = "grandfood_admin_recommendation_profiles";

export type AdminRecommendationProfile = {
  checkupDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  conditionFlags: ConditionFlag[];
  conditionsNote: string;
  allergies: string[];
  dislikedIngredients: string[];
  restrictions: string[];
  medications: { name: string; schedule: string }[];
  mealsPerDay: 1 | 2 | 3 | 4;
  chewingDifficulty: boolean;
  mobilityLevel: "independent" | "needs_assistance" | "bedridden";
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
  if (!current) return;
  saveAdminRecommendationProfile(residentId, { ...current, ...changes });
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
