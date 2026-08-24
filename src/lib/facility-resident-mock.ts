import type { CareFacility } from "@/lib/statistics-mock";

export type FacilityResidentMock = {
  id: string;
  name: string;
  age: number;
  gender: "남" | "여";
  address: string;
  mealRecordRate: number;
  averageIntakeRate: number;
  healthStatus: "양호" | "관찰 필요" | "집중 관리";
  lastMeal: string;
};

const FAMILY_NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const GIVEN_NAMES = ["영자", "정수", "순희", "복순", "경호", "미숙", "명자", "태식", "정임", "금자", "상현", "순자", "동철", "정희", "광수", "옥순", "영식", "미자", "병호", "춘자"];
const DISTRICTS: Record<string, string[]> = {
  강남구: ["삼성동", "역삼동", "대치동", "개포동", "논현동", "청담동"],
  마포구: ["공덕동", "아현동", "망원동", "연남동", "성산동", "합정동"],
  성남시: ["분당구", "수정구", "중원구"],
  수원시: ["영통구", "장안구", "팔달구", "권선구"],
};

export function createFacilityResidentMocks(facility: CareFacility): FacilityResidentMock[] {
  const prefix = facility.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();
  const districts = DISTRICTS[facility.municipality] ?? [facility.municipality];

  return Array.from({ length: facility.residents }, (_, index) => {
    const sequence = index + 1;
    const isFocused = index < facility.unresolvedAlerts;
    const isWatch = !isFocused && index < facility.lowIntakeResidents;
    const healthStatus = isFocused ? "집중 관리" : isWatch ? "관찰 필요" : "양호";
    const intakeOffset = ((index * 7 + facility.name.length) % 17) - 8;
    const recordOffset = (index * 3) % 12;

    return {
      id: `${prefix}-${String(sequence).padStart(3, "0")}`,
      name: `${FAMILY_NAMES[index % FAMILY_NAMES.length]}${GIVEN_NAMES[(index * 3 + facility.name.length) % GIVEN_NAMES.length]}`,
      age: 68 + ((index * 5 + facility.name.length) % 23),
      gender: index % 3 === 1 ? "남" : "여",
      address: `${facility.region} ${facility.municipality} ${districts[index % districts.length]}`,
      mealRecordRate: Math.max(62, Math.min(100, facility.mealRecordRate - recordOffset + 5)),
      averageIntakeRate: Math.max(35, Math.min(96, facility.averageIntakeRate + intakeOffset - (isFocused ? 22 : isWatch ? 12 : 0))),
      healthStatus,
      lastMeal: index % 11 === 0 ? "어제 저녁" : index % 5 === 0 ? "오늘 아침" : "오늘 점심",
    };
  });
}
