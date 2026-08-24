import { Resident } from "@/lib/admin-residents";

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
  return getEmptyResidentDetail(resident);
}
