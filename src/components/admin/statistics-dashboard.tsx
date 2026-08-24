"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  ChevronRight,
  CircleCheckBig,
  HeartPulse,
  MapPinned,
  TriangleAlert,
  UtensilsCrossed,
  UsersRound,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CARE_FACILITIES, type CareFacility } from "@/lib/statistics-mock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClassName =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function StatisticsDashboard({
  facilities = CARE_FACILITIES,
  scopeLabel = "전체",
  facilityDetailBasePath = "/admin/statistics/facilities",
}: {
  facilities?: CareFacility[];
  scopeLabel?: "시설" | "관할" | "전체";
  facilityDetailBasePath?: string | null;
}) {
  const router = useRouter();
  const facilityDetailHref = (facilityId: string) =>
    facilityDetailBasePath?.endsWith("=")
      ? `${facilityDetailBasePath}${encodeURIComponent(facilityId)}`
      : `${facilityDetailBasePath}/${facilityId}`;
  const [region, setRegion] = useState("전체");
  const [municipality, setMunicipality] = useState("전체");
  const [facilityType, setFacilityType] = useState("전체");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const regions = useMemo(
    () => [...new Set(facilities.map((facility) => facility.region))],
    [facilities],
  );
  const municipalities = useMemo(
    () => [
      ...new Set(
        facilities.filter(
          (facility) => region === "전체" || facility.region === region,
        ).map((facility) => facility.municipality),
      ),
    ],
    [facilities, region],
  );

  const filteredFacilities = useMemo(
    () =>
      facilities.filter(
        (facility) =>
          (region === "전체" || facility.region === region) &&
          (municipality === "전체" || facility.municipality === municipality) &&
          (facilityType === "전체" || facility.type === facilityType),
      ),
    [facilities, facilityType, municipality, region],
  );

  const totals = useMemo(() => {
    const residents = filteredFacilities.reduce(
      (sum, facility) => sum + facility.residents,
      0,
    );
    const weightedAverage = (key: "mealRecordRate" | "averageIntakeRate") =>
      residents
        ? Math.round(
            filteredFacilities.reduce(
              (sum, facility) => sum + facility[key] * facility.residents,
              0,
            ) / residents,
          )
        : 0;

    return {
      residents,
      mealRecordRate: weightedAverage("mealRecordRate"),
      averageIntakeRate: weightedAverage("averageIntakeRate"),
      lowIntakeResidents: filteredFacilities.reduce(
        (sum, facility) => sum + facility.lowIntakeResidents,
        0,
      ),
      unresolvedAlerts: filteredFacilities.reduce(
        (sum, facility) => sum + facility.unresolvedAlerts,
        0,
      ),
    };
  }, [filteredFacilities]);

  const municipalityStats = useMemo(() => {
    const grouped = new Map<string, { residents: number; lowIntake: number; alerts: number }>();
    for (const facility of filteredFacilities) {
      const current = grouped.get(facility.municipality) ?? {
        residents: 0,
        lowIntake: 0,
        alerts: 0,
      };
      current.residents += facility.residents;
      current.lowIntake += facility.lowIntakeResidents;
      current.alerts += facility.unresolvedAlerts;
      grouped.set(facility.municipality, current);
    }
    return [...grouped.entries()].sort((a, b) => b[1].residents - a[1].residents);
  }, [filteredFacilities]);

  const selectedFacility =
    filteredFacilities.find((facility) => facility.id === selectedFacilityId) ??
    filteredFacilities[0] ??
    null;

  function resetFilters() {
    setRegion("전체");
    setMunicipality("전체");
    setFacilityType("전체");
    setSelectedFacilityId(null);
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title="통합 모니터링"
        description={`${scopeLabel} 범위의 요양원·복지기관 식사 기록과 건강 이상 징후를 확인합니다.`}
        action={<Badge variant="secondary">오늘 14:30 기준</Badge>}
      />

      <Card className="border-primary/15 bg-gradient-to-r from-primary/5 via-card to-card">
        <CardContent className="flex flex-wrap items-end gap-3 py-1">
          <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            지역
            <select
              className={selectClassName}
              value={region}
              onChange={(event) => {
                setRegion(event.target.value);
                setMunicipality("전체");
                setSelectedFacilityId(null);
              }}
            >
              <option>전체</option>
              {regions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            지자체
            <select
              className={selectClassName}
              value={municipality}
              onChange={(event) => {
                setMunicipality(event.target.value);
                setSelectedFacilityId(null);
              }}
            >
              <option>전체</option>
              {municipalities.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
            시설 유형
            <select
              className={selectClassName}
              value={facilityType}
              onChange={(event) => {
                setFacilityType(event.target.value);
                setSelectedFacilityId(null);
              }}
            >
              <option>전체</option>
              <option>요양원</option>
              <option>사회복지기관</option>
            </select>
          </label>
          <Button type="button" variant="outline" onClick={resetFilters}>
            필터 초기화
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: scopeLabel === "시설" ? "소속 시설" : `${scopeLabel} 시설`, value: filteredFacilities.length, unit: "곳", icon: Building2, tone: "text-sky-600 bg-sky-50" },
          { label: scopeLabel === "시설" ? "시설 대상자" : `${scopeLabel} 대상자`, value: totals.residents, unit: "명", icon: UsersRound, tone: "text-indigo-600 bg-indigo-50" },
          { label: "식사 기록률", value: totals.mealRecordRate, unit: "%", icon: CircleCheckBig, tone: "text-emerald-600 bg-emerald-50" },
          { label: "평균 섭취율", value: totals.averageIntakeRate, unit: "%", icon: UtensilsCrossed, tone: "text-amber-600 bg-amber-50" },
          { label: "미조치 알림", value: totals.unresolvedAlerts, unit: "건", icon: TriangleAlert, tone: "text-rose-600 bg-rose-50" },
        ].map(({ label, value, unit, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {value.toLocaleString()}
                  <span className="ml-1 text-xs font-semibold text-muted-foreground">{unit}</span>
                </p>
              </div>
              <div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" /> 지자체별 관리 규모</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {municipalityStats.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                집계할 지자체 데이터가 없습니다.
              </p>
            )}
            {municipalityStats.map(([name, stat]) => {
              const percentage = totals.residents
                ? Math.round((stat.residents / totals.residents) * 100)
                : 0;
              return (
                <div key={name} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-bold">{name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">저섭취 {stat.lowIntake}명 · 미조치 {stat.alerts}건</span>
                    </div>
                    <span className="font-extrabold">{stat.residents}명</span>
                  </div>
                  <Progress value={percentage} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" /> 선택 시설 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFacility ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted/60 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold">{selectedFacility.name}</h3>
                      <Badge variant="outline">{selectedFacility.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedFacility.region} {selectedFacility.municipality} · {selectedFacility.municipalityCode}</p>
                  </div>
                  <Button size="sm" variant="outline">시설 상세 <ChevronRight /></Button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["관리 어르신", `${selectedFacility.residents}명`],
                    ["식사 기록률", `${selectedFacility.mealRecordRate}%`],
                    ["평균 섭취율", `${selectedFacility.averageIntakeRate}%`],
                    ["저섭취 위험", `${selectedFacility.lowIntakeResidents}명`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-extrabold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
                  <div className="flex items-center gap-2 font-bold"><Activity className="h-4 w-4" /> 확인이 필요한 건강 알림</div>
                  <p className="mt-1 text-sm">미조치 알림 {selectedFacility.unresolvedAlerts}건 · 최근 3일 연속 저섭취 대상자를 우선 확인하세요.</p>
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-muted-foreground">조건에 해당하는 시설이 없습니다.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>산하 시설별 운영 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>지역·지자체</TableHead>
                <TableHead>시설</TableHead>
                <TableHead>유형</TableHead>
                <TableHead className="text-right">어르신</TableHead>
                <TableHead className="text-right">기록률</TableHead>
                <TableHead className="text-right">섭취율</TableHead>
                <TableHead className="text-right">저섭취</TableHead>
                <TableHead className="text-right">미조치</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFacilities.map((facility) => (
                <TableRow
                  key={facility.id}
                  data-state={selectedFacility?.id === facility.id ? "selected" : undefined}
                  className={facilityDetailBasePath ? "cursor-pointer" : undefined}
                  onClick={() => {
                    if (facilityDetailBasePath) router.push(facilityDetailHref(facility.id));
                  }}
                >
                  <TableCell><p className="font-semibold">{facility.municipality}</p><p className="text-xs text-muted-foreground">{facility.region}</p></TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="font-bold underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (facilityDetailBasePath) router.push(facilityDetailHref(facility.id));
                      }}
                    >
                      {facility.name}
                    </button>
                  </TableCell>
                  <TableCell><Badge variant="outline">{facility.type}</Badge></TableCell>
                  <TableCell className="text-right">{facility.residents}명</TableCell>
                  <TableCell className="text-right font-semibold">{facility.mealRecordRate}%</TableCell>
                  <TableCell className="text-right font-semibold">{facility.averageIntakeRate}%</TableCell>
                  <TableCell className="text-right">{facility.lowIntakeResidents}명</TableCell>
                  <TableCell className="text-right"><Badge variant={facility.unresolvedAlerts >= 4 ? "destructive" : "secondary"}>{facility.unresolvedAlerts}건</Badge></TableCell>
                </TableRow>
              ))}
              {filteredFacilities.length === 0 && (
                <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">조건에 해당하는 시설이 없습니다.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </main>
  );
}
