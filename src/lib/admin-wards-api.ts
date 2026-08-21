import { getJson, patchJson, postJson } from "@/lib/api";
import { Resident } from "@/lib/admin-residents";
import { getEmptyResidentDetail, type ResidentDetail } from "@/lib/admin-resident-detail";
import type { CreateFacilityWardPayload } from "@/lib/admin-ward-registration";
import { getConditionLabel } from "@/lib/admin-ward-registration";

/** 백엔드 GET/POST /gov/facility/wards 응답 항목
 * (organization/schemas.py의 WardSummaryResponse). */
export type WardSummary = {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | null;
  address: string;
  facility_code: string | null;
  condition_flags: string[];
  guardian_name: string | null;
  guardian_phone: string | null;
  medications_note?: string | null;
  note?: string | null;
  case_worker_name: string | null;
  case_worker_role: string | null;
};

export type WardFoodRule = {
  rule_type: "allergy" | "dislike" | "restriction";
  item_name: string;
  note: string | null;
};

export type WardDetail = {
  id: string;
  name: string;
  gender: "male" | "female" | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  checkup_date: string | null;
  condition_flags: string[];
  conditions_note: string | null;
  food_rules: WardFoodRule[];
  medications_note: string | null;
  meals_per_day: number | null;
  chewing_difficulty: boolean | null;
  mobility_level: "independent" | "needs_assistance" | "bedridden" | null;
  case_worker_name: string | null;
  case_worker_role: string | null;
};

export type UpdateWardHealthProfilePayload = Partial<{
  checkup_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: string | null;
  condition_flags: string[];
  conditions_note: string | null;
  food_rules: WardFoodRule[];
  medications_note: string | null;
  meals_per_day: number | null;
  chewing_difficulty: boolean | null;
  mobility_level: "independent" | "needs_assistance" | "bedridden" | null;
}>;

export type UpdateWardBasicInfoPayload = Partial<{
  name: string;
  birth_date: string;
  gender: "male" | "female";
  phone: string;
  address: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  note: string | null;
  care_facility_id: string;
}>;

export type WardBasicInfoResponse = {
  id: string;
  name: string;
  birth_date: string;
  gender: "male" | "female" | null;
  phone: string;
  address: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  note: string | null;
  care_facility_id: string | null;
};

export function toResident(ward: WardSummary): Resident {
  return {
    id: ward.id,
    name: ward.name,
    age: ward.age,
    gender: ward.gender === "male" ? "남" : ward.gender === "female" ? "여" : "미상",
    facilityCode: ward.facility_code ?? undefined,
    address: ward.address,
    dong: ward.address,
    // admin-resident-detail.ts의 getResidentDetail이 이 문자열을 "·"로 쪼개 진단명
    // 목록을 만드므로, 실제 condition_flags를 같은 구분자로 이어 붙인다.
    condition: ward.condition_flags.length > 0
      ? ward.condition_flags.map(getConditionLabel).join(" · ")
      : "특이사항 없음",
    // 최근 응답/위험도는 아직 실제 데이터 소스가 없어 중립값으로 둔다 — 백엔드에
    // 이상신호(health/alerts_service.py) 기반 위험도 API가 생기면 여기서 채워 넣으면 된다.
    lastResponse: "-",
    lastResponseTone: "neutral",
    risk: "보통",
    guardianName: ward.guardian_name ?? "미등록",
    guardianPhone: ward.guardian_phone ?? "미등록",
    caseWorker: ward.case_worker_name
      ? `${ward.case_worker_name}${ward.case_worker_role ? ` (${ward.case_worker_role})` : ""}`
      : undefined,
    note: ward.note ?? "",
  };
}

export async function createFacilityWard(payload: CreateFacilityWardPayload): Promise<Resident> {
  const ward = await postJson<WardSummary>("/gov/facility/wards", { ...payload });
  return toResident(ward);
}

export async function fetchFacilityWards(): Promise<Resident[]> {
  const wards = await getJson<WardSummary[]>("/gov/facility/wards");
  const facilitySequence = new Map<string, number>();
  return wards.map((ward) => {
    const facilityKey = ward.facility_code ?? "미지정";
    const sequence = (facilitySequence.get(facilityKey) ?? 0) + 1;
    facilitySequence.set(facilityKey, sequence);
    return { ...toResident(ward), displayId: String(sequence).padStart(3, "0") };
  });
}

export function fetchFacilityWardDetail(userId: string): Promise<WardDetail> {
  return getJson<WardDetail>(`/gov/facility/wards/${userId}`);
}

export function updateFacilityWardHealthProfile(
  userId: string,
  payload: UpdateWardHealthProfilePayload,
): Promise<WardDetail> {
  return patchJson<WardDetail>(`/gov/facility/wards/${userId}/health-profile`, payload);
}

/** 프론트 선구현 계약. 백엔드 PATCH /gov/facility/wards/{id}가 추가되면 바로 동작한다. */
export function updateFacilityWardBasicInfo(
  userId: string,
  payload: UpdateWardBasicInfoPayload,
): Promise<WardBasicInfoResponse> {
  return patchJson<WardBasicInfoResponse>(`/gov/facility/wards/${userId}`, payload);
}

export function wardDetailToView(ward: WardDetail, resident: Resident): ResidentDetail {
  const empty = getEmptyResidentDetail(resident);
  const rules = (type: WardFoodRule["rule_type"]) =>
    ward.food_rules.filter((rule) => rule.rule_type === type).map((rule) => rule.item_name);
  const medications = (ward.medications_note ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...schedule] = line.split("/");
      return { name: name.trim(), schedule: schedule.join("/").trim() || "-" };
    });
  const mobilityLabel = ward.mobility_level === "independent"
    ? "독립 보행"
    : ward.mobility_level === "needs_assistance"
      ? "보행 도움 필요"
      : ward.mobility_level === "bedridden"
        ? "와상"
        : "-";

  return {
    ...empty,
    caseWorker: ward.case_worker_name
      ? `${ward.case_worker_name}${ward.case_worker_role ? ` (${ward.case_worker_role})` : ""}`
      : "-",
    diagnoses: ward.condition_flags.map(getConditionLabel),
    allergies: rules("allergy"),
    dislikedIngredients: rules("dislike"),
    restrictions: rules("restriction"),
    medications,
    otherNote: ward.conditions_note ?? "-",
    mealsPerDay: ward.meals_per_day ?? "-",
    chewingDifficulty: ward.chewing_difficulty,
    mobilityLevel: mobilityLabel,
    checkup: {
      ...empty.checkup,
      date: ward.checkup_date ?? "-",
      heightCm: ward.height_cm ?? "-",
      weightKg: ward.weight_kg ?? "-",
      activityLevel: ward.activity_level
        ? ({
            sedentary: "거의 움직이지 않음",
            low_active: "가벼운 활동",
            active: "보통 활동",
            very_active: "매우 활발함",
          }[ward.activity_level] ?? ward.activity_level)
        : "-",
    },
  };
}
