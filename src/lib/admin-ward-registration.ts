// B2C 앱(grandfood_front_app)의 UserOnboardingRequest/건강 설문과 같은 값 규격을 쓴다.
// 관리자용 생성 API가 준비되면 이 payload를 POST /gov/facility/wards에 그대로 보낼 수 있다.
export const CONDITION_OPTIONS = [
  { label: "고혈압", value: "hypertension" },
  { label: "당뇨", value: "diabetes" },
  { label: "심부전", value: "heart_failure" },
  { label: "신장질환", value: "chronic_kidney_disease" },
  { label: "치매", value: "dementia" },
  { label: "관절염", value: "arthritis" },
] as const;

export type ConditionFlag = (typeof CONDITION_OPTIONS)[number]["value"];

export const ACTIVITY_LEVEL_OPTIONS = [
  { label: "거의 움직이지 않음", value: "sedentary" },
  { label: "가벼운 활동", value: "low_active" },
  { label: "보통 활동", value: "active" },
  { label: "매우 활발함", value: "very_active" },
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVEL_OPTIONS)[number]["value"];
export type FoodRuleType = "allergy" | "dislike" | "restriction";

export type WardFoodRuleInput = {
  rule_type: FoodRuleType;
  item_name: string;
  note: string | null;
};

export type CreateFacilityWardPayload = {
  name: string;
  birth_date: string;
  gender: "male" | "female";
  phone: string;
  address: string;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  condition_flags: ConditionFlag[];
  conditions_note: string | null;
  food_rules: WardFoodRuleInput[];
  guardian_name: string | null;
  guardian_phone: string | null;
  medications_note: string | null;
  note: string | null;
};

export type FacilityWardRegistrationDraft = {
  facility_code: string;
  payload: CreateFacilityWardPayload;
};

export function splitItems(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function makeFoodRules(
  allergyItems: string[],
  dislikedItems: string[],
  restrictionItems: string[],
): WardFoodRuleInput[] {
  return [
    ...allergyItems.map((item_name) => ({ rule_type: "allergy" as const, item_name, note: null })),
    ...dislikedItems.map((item_name) => ({ rule_type: "dislike" as const, item_name, note: null })),
    ...restrictionItems.map((item_name) => ({
      rule_type: "restriction" as const,
      item_name,
      note: null,
    })),
  ];
}
