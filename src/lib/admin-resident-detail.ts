import { Resident } from "@/lib/admin-residents";

export type MealTone = "완식" | "소량" | "미응답";

export type ResidentDetail = {
  caseWorker: string;
  livingAlone: boolean;
  supportType: string;
  diagnoses: string[];
  allergies: string[];
  medications: { name: string; schedule: string }[];
  chewingNote: string;
  checkup: {
    date: string;
    systolicBP: number | string;
    fastingGlucose: number | string;
    hba1c: number | string;
    egfr: number | string;
    weightKg: number | string;
    albumin: number | string;
  };
  diet: {
    name: string;
    sodiumMg: number | string;
    proteinG: number | string;
    kcal: number | string;
    reasons: string[];
  };
  mealHistory: MealTone[];
};

export function getEmptyResidentDetail(): ResidentDetail {
  return {
    caseWorker: "-",
    livingAlone: false,
    supportType: "-",
    diagnoses: [],
    allergies: [],
    medications: [],
    chewingNote: "-",
    checkup: {
      date: "-",
      systolicBP: "-",
      fastingGlucose: "-",
      hba1c: "-",
      egfr: "-",
      weightKg: "-",
      albumin: "-",
    },
    diet: {
      name: "미배정",
      sodiumMg: "-",
      proteinG: "-",
      kcal: "-",
      reasons: [],
    },
    mealHistory: [],
  };
}

function seed(id: string) {
  let s = 0;
  for (const ch of id) s += ch.charCodeAt(0);
  return s;
}

const ALLERGY_POOL = ["없음", "고등어(해산물)", "메밀", "갑각류", "우유", "견과류"];
const CASE_WORKERS = ["김미정 사회복지사", "박정현 주무관"];

export function getResidentDetail(resident: Resident): ResidentDetail {
  const s = seed(resident.id);
  const diagnoses = resident.condition
    .split("·")
    .map((c) => c.trim())
    .filter(Boolean);
  const has = (keyword: string) => diagnoses.some((d) => d.includes(keyword));

  const allergies = [ALLERGY_POOL[s % ALLERGY_POOL.length]];

  const medications: { name: string; schedule: string }[] = [];
  if (has("고혈압")) medications.push({ name: "암로디핀 5mg", schedule: "1일 1회 · 아침" });
  if (has("당뇨")) medications.push({ name: "메트포르민 500mg", schedule: "1일 2회 · 식후" });
  if (has("골다공증") || has("골감소증"))
    medications.push({ name: "칼슘 + 비타민D", schedule: "1일 1회 · 저녁" });
  if (has("고지혈") || has("LDL"))
    medications.push({ name: "아토르바스타틴 10mg", schedule: "1일 1회 · 저녁" });
  if (medications.length === 0)
    medications.push({ name: "특이 복약 없음", schedule: "-" });

  const chewingNote =
    resident.age >= 85
      ? "틀니 사용 · 질긴 육류는 다짐육으로 대체 권고"
      : resident.age >= 80
        ? "일반식 가능 · 질긴 음식은 주의가 필요해요"
        : "저작·연하 상태 정상";

  const systolicBP = 118 + (has("고혈압") ? 24 : 0) + (s % 7);
  const fastingGlucose = 92 + (has("당뇨") ? 34 : 0) + (s % 10);
  const hba1c = Number((5.6 + (has("당뇨") ? 1.3 : 0) + (s % 5) * 0.1).toFixed(1));
  const egfr = 88 - (has("신장") ? 26 : 0) - Math.max(0, resident.age - 75);
  const weightKg = (resident.gender === "여" ? 54 : 66) - Math.max(0, resident.age - 75) * 0.3;
  const albumin = Number((4.0 - (resident.risk === "고위험" ? 0.7 : 0.2) - (s % 4) * 0.05).toFixed(1));

  const dietName = has("신장")
    ? "저인 · 저칼륨 관리식"
    : has("당뇨")
      ? "저염 · 단백강화 당뇨식"
      : has("고혈압")
        ? "저염 관리형 식단"
        : "일반 균형식";

  const sodiumMg = has("고혈압") || has("당뇨") || has("신장") ? 1500 : 1800;
  const proteinG = resident.risk === "고위험" ? 68 : 58;
  const kcal = 1550 + (s % 4) * 30;

  const reasons: string[] = [];
  if (has("고혈압"))
    reasons.push(`수축기 ${systolicBP}mmHg → 나트륨 1일 ${sodiumMg}mg 이하로 제한`);
  if (has("당뇨"))
    reasons.push(`공복혈당 ${fastingGlucose}mg/dL → 단순당 제한, 잡곡 위주 구성`);
  if (has("신장"))
    reasons.push(`eGFR ${egfr} → 인·칼륨 상한 적용, 국물류 축소`);
  if (allergies[0] !== "없음")
    reasons.push(`${allergies[0]} 알레르기 → 대체 단백원(닭가슴살·두부)으로 치환`);
  if (resident.risk === "고위험")
    reasons.push("최근 섭취량 저하 신호 → 단백질 비중 상향 조정");
  if (reasons.length === 0)
    reasons.push("특별한 위험 요인 없음 → 표준 균형식 유지");

  const lastMatch = resident.lastResponse.match(/(\d+)(일|오늘|어제)?\s*(미응답|소량|완식)?/);
  const tailCount = resident.lastResponseTone === "danger"
    ? Number(lastMatch?.[1] ?? 3)
    : resident.lastResponseTone === "warning"
      ? Number(lastMatch?.[1] ?? 2)
      : 0;
  const tailTone: MealTone =
    resident.lastResponseTone === "danger"
      ? "미응답"
      : resident.lastResponseTone === "warning"
        ? "소량"
        : "완식";

  const mealHistory: MealTone[] = [];
  for (let i = 0; i < 14; i++) {
    if (i >= 14 - tailCount) {
      mealHistory.push(tailTone);
    } else {
      mealHistory.push((s + i) % 5 === 0 ? "소량" : "완식");
    }
  }

  return {
    caseWorker: CASE_WORKERS[s % CASE_WORKERS.length],
    livingAlone: s % 2 === 0,
    supportType: s % 3 === 0 ? "기초생활" : "차상위",
    diagnoses,
    allergies,
    medications,
    chewingNote,
    checkup: {
      date: "2026.05.14",
      systolicBP,
      fastingGlucose,
      hba1c,
      egfr,
      weightKg: Number(weightKg.toFixed(1)),
      albumin,
    },
    diet: { name: dietName, sodiumMg, proteinG, kcal, reasons },
    mealHistory,
  };
}
