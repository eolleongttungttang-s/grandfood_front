import { getJson, postJson } from "@/lib/api";
import { Resident } from "@/lib/admin-residents";
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

export function toResident(ward: WardSummary): Resident {
  return {
    id: ward.id,
    name: ward.name,
    age: ward.age,
    gender: ward.gender === "male" ? "남" : "여",
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
