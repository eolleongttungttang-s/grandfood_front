"use client";

import { useEffect, useState } from "react";

import {
  StatisticsDashboard,
  type CareFacility,
} from "@/components/admin/statistics-dashboard";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getJson } from "@/lib/api";
import type { WardSummary } from "@/lib/admin-wards-api";

type FacilityApiResponse = {
  facility_id: string;
  name: string;
  facility_type: "MUNICIPALITY" | "NURSING_HOME" | "WELFARE_CENTER";
  department: string | null;
  facility_code: string;
};

const facilityTypeLabels: Record<FacilityApiResponse["facility_type"], CareFacility["type"]> = {
  MUNICIPALITY: "지자체",
  NURSING_HOME: "요양원",
  WELFARE_CENTER: "사회복지기관",
};

function mapDatabaseFacilities(
  facilities: FacilityApiResponse[],
  wards: WardSummary[],
): CareFacility[] {
  const municipalities = facilities.filter(
    (facility) => facility.facility_type === "MUNICIPALITY",
  );
  const residentCounts = new Map<string, number>();

  for (const ward of wards) {
    if (!ward.facility_code) continue;
    residentCounts.set(
      ward.facility_code,
      (residentCounts.get(ward.facility_code) ?? 0) + 1,
    );
  }

  return facilities.map((facility) => {
    const parentMunicipality =
      facility.facility_type === "MUNICIPALITY"
        ? facility
        : municipalities.find((candidate) =>
            facility.facility_code.startsWith(`${candidate.facility_code}-`),
          );

    return {
      id: facility.facility_id,
      region: facility.department ?? parentMunicipality?.department ?? "미등록",
      municipality: parentMunicipality?.name ?? "미등록",
      municipalityCode: parentMunicipality?.facility_code ?? facility.facility_code,
      name: facility.name,
      type: facilityTypeLabels[facility.facility_type],
      residents: residentCounts.get(facility.facility_code) ?? 0,
      mealRecordRate: 0,
      averageIntakeRate: 0,
      lowIntakeResidents: 0,
      unresolvedAlerts: 0,
    };
  });
}

export function DatabaseStatisticsDashboard() {
  const [facilities, setFacilities] = useState<CareFacility[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [facilityRows, wardRows] = await Promise.all([
          getJson<FacilityApiResponse[]>("/api/admin/facilities"),
          getJson<WardSummary[]>("/gov/facility/wards"),
        ]);
        if (!cancelled) setFacilities(mapDatabaseFacilities(facilityRows, wardRows));
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

  if (facilities) return <StatisticsDashboard facilities={facilities} />;

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title="통합 급식 모니터링"
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
