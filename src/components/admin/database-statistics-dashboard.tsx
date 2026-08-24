"use client";

import { useEffect, useState } from "react";

import { StatisticsDashboard } from "@/components/admin/statistics-dashboard";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getJson } from "@/lib/api";
import { readAdminSession, type AdminSession } from "@/lib/admin-auth";
import type { WardSummary } from "@/lib/admin-wards-api";
import type { CareFacility } from "@/lib/statistics-mock";

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

const SIDO_ALIASES: Array<[string, string[]]> = [
  ["서울특별시", ["서울특별시", "서울"]], ["부산광역시", ["부산광역시", "부산"]],
  ["대구광역시", ["대구광역시", "대구"]], ["인천광역시", ["인천광역시", "인천"]],
  ["광주광역시", ["광주광역시", "광주"]], ["대전광역시", ["대전광역시", "대전"]],
  ["울산광역시", ["울산광역시", "울산"]], ["세종특별자치시", ["세종특별자치시", "세종"]],
  ["경기도", ["경기도", "경기"]], ["강원특별자치도", ["강원특별자치도", "강원도", "강원"]],
  ["충청북도", ["충청북도", "충북"]], ["충청남도", ["충청남도", "충남"]],
  ["전북특별자치도", ["전북특별자치도", "전라북도", "전북"]], ["전라남도", ["전라남도", "전남"]],
  ["경상북도", ["경상북도", "경북"]], ["경상남도", ["경상남도", "경남"]],
  ["제주특별자치도", ["제주특별자치도", "제주"]],
];

const SEOUL_DISTRICTS = new Set([
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
  "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
  "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구",
]);

const SEOUL_AGENCY_PREFIXES = new Set([
  "JR", "JG", "YS", "SD", "GJ", "DDM", "JL", "SB", "GB", "DB", "NW", "EP", "SDM",
  "MP", "YC", "GS", "GR", "GC", "YDP", "DJ", "GA", "SC", "GN", "SP", "GD",
]);

function resolveRegionName(
  facilityCode: string | null | undefined,
  ...values: Array<string | null | undefined>
) {
  const agencyPrefix = facilityCode?.split("-")[0]?.toUpperCase();
  if (agencyPrefix && SEOUL_AGENCY_PREFIXES.has(agencyPrefix)) return "서울특별시";

  const texts = values.filter((value): value is string => Boolean(value));
  for (const [officialName, aliases] of SIDO_ALIASES) {
    if (texts.some((text) => aliases.some((alias) => text.includes(alias)))) return officialName;
  }
  if (texts.some((text) => [...SEOUL_DISTRICTS].some((district) => text.includes(district)))) {
    return "서울특별시";
  }
  return "미등록";
}

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

  return facilities
    .filter((facility) => facility.facility_type !== "MUNICIPALITY")
    .map((facility) => {
      const parentMunicipality = municipalities.find((candidate) =>
        facility.facility_code.startsWith(`${candidate.facility_code}-`),
      );

      return {
        id: facility.facility_id,
        region: resolveRegionName(
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
        if (!cancelled) {
          setScopeLabel(dashboardScopeLabel(session));
          setFacilities(
            mapDatabaseFacilities(
              facilitiesVisibleToSession(facilityRows, session),
              wardRows,
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

  if (facilities) return <StatisticsDashboard facilities={facilities} scopeLabel={scopeLabel} facilityDetailBasePath="/admin/statistics-empty/facility?id=" />;

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
