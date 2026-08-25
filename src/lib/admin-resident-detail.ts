import { DEMO_RESIDENT_ID, Resident } from "@/lib/admin-residents";

export type ResidentDetail = {
  caseWorker: string;
  livingAlone: boolean;
  diagnoses: string[];
  allergies: string[];
  medications: { name: string; schedule: string }[];
  otherNote: string;
  dislikedIngredients: string[];
  restrictions: string[];
  mealsPerDay: number | string;
  chewingDifficulty: boolean | null;
  mobilityLevel: string;
  checkup: {
    date: string;
    activityLevel: string;
    systolicBP: number | string;
    fastingGlucose: number | string;
    hba1c: number | string;
    egfr: number | string;
    heightCm: number | string;
    weightKg: number | string;
    albumin: number | string;
  };
};

export function getEmptyResidentDetail(resident?: Resident): ResidentDetail {
  const diagnoses = resident?.condition
    ? resident.condition.split(/[,\n·]/).map((item) => item.trim()).filter(Boolean)
    : [];

  return {
    caseWorker: "-",
    livingAlone: false,
    diagnoses,
    allergies: resident?.allergies ?? [],
    medications: resident?.medications ?? [],
    otherNote: resident?.note ?? "-",
    dislikedIngredients: [],
    restrictions: [],
    mealsPerDay: "-",
    chewingDifficulty: null,
    mobilityLevel: "-",
    checkup: {
      date: "-",
      activityLevel: "-",
      systolicBP: "-",
      fastingGlucose: "-",
      hba1c: "-",
      egfr: "-",
      heightCm: "-",
      weightKg: "-",
      albumin: "-",
    },
  };
}

export function getResidentDetail(resident: Resident): ResidentDetail {
  if (resident.id === DEMO_RESIDENT_ID) {
    return {
      caseWorker: resident.caseWorker ?? "박지현 (사회복지사)",
      livingAlone: false,
      diagnoses: ["고혈압", "당뇨"],
      allergies: ["우유", "땅콩"],
      medications: [{ name: "암로디핀 5mg", schedule: "1일 1회 아침" }, { name: "메트포르민 500mg", schedule: "1일 2회 식후" }],
      otherNote: "저염식을 선호하며 아침 식사량이 적어 섭취 추이를 관찰하고 있습니다.",
      dislikedIngredients: ["가지"],
      restrictions: ["고염식", "단순당 과다 음식"],
      mealsPerDay: 3,
      chewingDifficulty: false,
      mobilityLevel: "independent",
      checkup: {
        date: "2026-08-18",
        activityLevel: "low_active",
        systolicBP: 142,
        fastingGlucose: 118,
        hba1c: 6.8,
        egfr: 72,
        heightCm: 154,
        weightKg: 54,
        albumin: 4.1,
      },
    };
  }
  return getEmptyResidentDetail(resident);
}
