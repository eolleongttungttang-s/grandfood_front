"use client";

import { useEffect, useState } from "react";

import { StatisticsDashboard } from "@/components/admin/statistics-dashboard";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getJson } from "@/lib/api";
import { readAdminSession, type AdminSession } from "@/lib/admin-auth";
import type { WardSummary } from "@/lib/admin-wards-api";
import type { CareFacility } from "@/lib/statistics-mock";
import { resolveAdminRegion } from "@/lib/admin-region";

type FacilityApiResponse = {
  facility_id: string;
  name: string;
  facility_type: "MUNICIPALITY" | "NURSING_HOME" | "WELFARE_CENTER";
  department: string | null;
  facility_code: string;
};

type DietHistoryEntry = {
  meal_date: string;
  meal_type: string;
  completed: boolean;
  recorded: boolean;
  quick_check_status: string | null;
  dishes: Array<{ leftover_pct: number }>;
};

type DietHistoryResponse = { items: DietHistoryEntry[] };

export type WardMealStats = {
  expectedMeals: number;
  recordedMeals: number;
  intakeRates: number[];
};

const facilityTypeLabels: Record<FacilityApiResponse["facility_type"], CareFacility["type"]> = {
  MUNICIPALITY: "지자체",
  NURSING_HOME: "요양원",
  WELFARE_CENTER: "사회복지기관",
};


function facilitiesVisibleToSession(
  facilities: FacilityApiResponse[],
  session: AdminSession | null,
) {
  if (!session) return [];
  if (
    session.accessLevel === "SUPER_ADMIN" ||
    session.accessLevel === "MUNICIPALITY_ADMIN"
  ) return facilities;

  if (
    session.accessLevel === "CARE_FACILITY_ADMIN" ||
    session.accessLevel === "CARE_FACILITY_NUTRITIONIST"
  ) {
    return facilities.filter(
      (facility) => facility.facility_code === session.careFacilityCode,
    );
  }

  if (session.accessLevel === "MUNICIPALITY_STAFF" && session.facilityCode) {
    return facilities.filter(
      (facility) =>
        facility.facility_code === session.facilityCode ||
        facility.facility_code.startsWith(`${session.facilityCode}-`),
    );
  }

  return [];
}

function dashboardScopeLabel(session: AdminSession | null) {
  if (
    session?.accessLevel === "CARE_FACILITY_ADMIN" ||
    session?.accessLevel === "CARE_FACILITY_NUTRITIONIST"
  ) return "시설";
  if (session?.accessLevel === "MUNICIPALITY_STAFF") return "관할";
  return "전체";
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mealStatsForWard(ward: WardSummary, entries: DietHistoryEntry[]): WardMealStats {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const firstDate = new Date(today);
  firstDate.setDate(firstDate.getDate() - 7);
  const registeredDate = ward.created_at?.slice(0, 10);
  const eligibleStart = registeredDate && registeredDate > dateKey(firstDate)
    ? registeredDate
    : dateKey(firstDate);
  const todayKey = dateKey(today);
  let eligibleDays = 0;
  for (const cursor = new Date(firstDate); dateKey(cursor) < todayKey; cursor.setDate(cursor.getDate() + 1)) {
    if (dateKey(cursor) >= eligibleStart) eligibleDays += 1;
  }

  const uniqueEntries = new Map<string, DietHistoryEntry>();
  for (const entry of entries) {
    if (entry.meal_date < eligibleStart || entry.meal_date >= todayKey) continue;
    const key = `${entry.meal_date}:${entry.meal_type}`;
    const current = uniqueEntries.get(key);
    if (!current || (!current.completed && entry.completed)) uniqueEntries.set(key, entry);
  }

  const recordedEntries = [...uniqueEntries.values()].filter((entry) => entry.recorded);
  const intakeRates = recordedEntries.flatMap((entry) => {
    if (entry.completed && entry.dishes.length > 0) {
      return [entry.dishes.reduce((sum, dish) => sum + (100 - dish.leftover_pct), 0) / entry.dishes.length];
    }
    return [];
  });

  return { expectedMeals: eligibleDays * 3, recordedMeals: recordedEntries.length, intakeRates };
}

export async function fetchWardMealStats(wards: WardSummary[]) {
  const results = await Promise.all(
    wards.map(async (ward) => {
      try {
        const history = await getJson<DietHistoryResponse>(
          `/app/elder/${encodeURIComponent(ward.id)}/diet-history?days=8`,
        );
        return [ward.id, mealStatsForWard(ward, history.items ?? [])] as const;
      } catch {
        return [ward.id, null] as const;
      }
    }),
  );
  return new Map(results);
}

function mapDatabaseFacilities(
  facilities: FacilityApiResponse[],
  wards: WardSummary[],
  mealStats: Map<string, WardMealStats | null>,
): CareFacility[] {
  const municipalities = facilities.filter(
    (facility) => facility.facility_type === "MUNICIPALITY",
  );
  const residentCounts = new Map<string, number>();

  for (const ward of wards) {
    const facilityKey = ward.facility_code?.trim().toUpperCase();
    if (!facilityKey) continue;
    residentCounts.set(
      facilityKey,
      (residentCounts.get(facilityKey) ?? 0) + 1,
    );
  }

  return facilities
    .filter((facility) => facility.facility_type !== "MUNICIPALITY")
    .map((facility) => {
      const parentMunicipality = municipalities.find((candidate) =>
        facility.facility_code.startsWith(`${candidate.facility_code}-`),
      );
      const facilityWardStats = wards
        .filter((ward) =>
          ward.facility_code?.trim().toUpperCase() === facility.facility_code.trim().toUpperCase(),
        )
        .map((ward) => mealStats.get(ward.id))
        .filter((stats): stats is WardMealStats => stats != null);
      const expectedMeals = facilityWardStats.reduce((sum, stats) => sum + stats.expectedMeals, 0);
      const recordedMeals = facilityWardStats.reduce((sum, stats) => sum + stats.recordedMeals, 0);
      const intakeRates = facilityWardStats.flatMap((stats) => stats.intakeRates);

      return {
        id: facility.facility_id,
        region: resolveAdminRegion(
          parentMunicipality?.facility_code ?? facility.facility_code,
          parentMunicipality?.name,
          parentMunicipality?.department,
          facility.name,
          facility.department,
        ),
        municipality: parentMunicipality?.name ?? "미등록",
        municipalityCode: parentMunicipality?.facility_code ?? facility.facility_code,
        name: facility.name,
        type: facilityTypeLabels[facility.facility_type],
        residents:
          residentCounts.get(facility.facility_code.trim().toUpperCase()) ??
          0,
        mealRecordRate: expectedMeals ? Math.round((recordedMeals / expectedMeals) * 100) : 0,
        averageIntakeRate: intakeRates.length
          ? Math.round(intakeRates.reduce((sum, rate) => sum + rate, 0) / intakeRates.length)
          : 0,
        lowIntakeResidents: 0,
        unresolvedAlerts: 0,
      };
    });
}

export function DatabaseStatisticsDashboard() {
  const [facilities, setFacilities] = useState<CareFacility[] | null>(null);
  const [scopeLabel, setScopeLabel] = useState<"시설" | "관할" | "전체">("전체");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const session = readAdminSession();
        const facilityRows = await getJson<FacilityApiResponse[]>(
          "/api/admin/facilities",
        );
        const wardRows = await getJson<WardSummary[]>("/gov/facility/wards").catch(
          () => [] as WardSummary[],
        );
        const mealStats = await fetchWardMealStats(wardRows);
        if (!cancelled) {
          setScopeLabel(dashboardScopeLabel(session));
          setFacilities(
            mapDatabaseFacilities(
              facilitiesVisibleToSession(facilityRows, session),
              wardRows,
              mealStats,
            ),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "기관과 대상자 정보를 불러오지 못했습니다.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (facilities) return <StatisticsDashboard facilities={facilities} scopeLabel={scopeLabel} facilityDetailBasePath="/admin/statistics-empty/facility?id=" title="통합 모니터링" />;

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title="통합 모니터링"
        description="DB에 등록된 기관과 대상자 정보를 불러오고 있습니다."
      />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          {error ?? "기관과 대상자 정보를 불러오는 중입니다."}
        </CardContent>
      </Card>
    </main>
  );
}
