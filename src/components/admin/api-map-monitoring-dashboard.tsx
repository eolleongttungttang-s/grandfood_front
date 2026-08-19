"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Building2, ChevronDown, Map as MapIcon, MapPinned, RefreshCw, UtensilsCrossed, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJson } from "@/lib/api";
import { readAdminSession } from "@/lib/admin-auth";
import type { WardSummary } from "@/lib/admin-wards-api";
import { projectMapFeatures, type MapGeometry } from "@/lib/admin-map-geometry";

type MapLevel = "sido" | "sigungu";
type RegionFeature = { type: "Feature"; properties: { code: string; name: string }; geometry: MapGeometry };
type FeatureCollection = { type: "FeatureCollection"; features: RegionFeature[] };
type FacilityRow = {
  facility_id: string;
  name: string;
  facility_type: "MUNICIPALITY" | "NURSING_HOME" | "WELFARE_CENTER";
  department: string | null;
  facility_code: string;
};

const PUBLIC_GEOJSON_URL: Record<MapLevel, string> = {
  sido: "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json",
  sigungu: "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json",
};

const FACILITY_TYPE_LABEL: Record<FacilityRow["facility_type"], string> = {
  MUNICIPALITY: "지자체",
  NURSING_HOME: "요양원",
  WELFARE_CENTER: "사회복지기관",
};

// 지도 행정구역 코드와 DB 기관코드의 앞자리를 연결한다.
// 시설명/부서명이 비어 있거나 달라도 기관코드 계층으로 산하시설을 찾을 수 있다.
const SEOUL_DISTRICT_PREFIX_BY_REGION_CODE: Record<string, string> = {
  "11110": "JR", "11140": "JG", "11170": "YS", "11200": "SD", "11215": "GJ",
  "11230": "DDM", "11260": "JL", "11290": "SB", "11305": "GB", "11320": "DB",
  "11350": "NW", "11380": "EP", "11410": "SDM", "11440": "MP", "11470": "YC",
  "11500": "GS", "11530": "GR", "11545": "GC", "11560": "YDP", "11590": "DJ",
  "11620": "GA", "11650": "SC", "11680": "GN", "11710": "SP", "11740": "GD",
};

function normalizePublicFeatures(data: { features?: Array<{ type: "Feature"; properties: Record<string, string>; geometry: MapGeometry }> }, level: MapLevel, parentCode: string | null): RegionFeature[] {
  return (data.features ?? [])
    .map((feature) => ({
      type: "Feature" as const,
      properties: {
        code: String(feature.properties.code ?? feature.properties.adm_cd ?? feature.properties.CTPRVN_CD ?? feature.properties.SIG_CD ?? ""),
        name: String(feature.properties.name ?? feature.properties.CTP_KOR_NM ?? feature.properties.SIG_KOR_NM ?? ""),
      },
      geometry: feature.geometry,
    }))
    .filter((feature) => level === "sido" || !parentCode || feature.properties.code.startsWith(parentCode));
}

async function fetchPublicBoundaries(level: MapLevel, parentCode: string | null): Promise<RegionFeature[]> {
  const response = await fetch(PUBLIC_GEOJSON_URL[level], { cache: "force-cache" });
  if (!response.ok) throw new Error(`공개 지도 경계를 불러오지 못했습니다. (${response.status})`);
  return normalizePublicFeatures(await response.json(), level, parentCode);
}

function belongsToRegion(facility: FacilityRow, regionName: string) {
  const aliases: Record<string, string[]> = {
    서울특별시: ["서울"], 부산광역시: ["부산"], 대구광역시: ["대구"],
    인천광역시: ["인천"], 광주광역시: ["광주"], 대전광역시: ["대전"],
    울산광역시: ["울산"], 세종특별자치시: ["세종"], 경기도: ["경기"],
    강원도: ["강원"], 강원특별자치도: ["강원"], 충청북도: ["충북"],
    충청남도: ["충남"], 전라북도: ["전북"], 전북특별자치도: ["전북"],
    전라남도: ["전남"], 경상북도: ["경북"], 경상남도: ["경남"],
    제주특별자치도: ["제주"],
  };
  const names = [regionName, ...(aliases[regionName] ?? [])];
  return [facility.department, facility.name].some(
    (value) => value ? names.some((name) => value.includes(name)) : false,
  );
}

function municipalityForRegion(facilities: FacilityRow[], feature: RegionFeature) {
  const prefix = SEOUL_DISTRICT_PREFIX_BY_REGION_CODE[feature.properties.code];
  return facilities.find((facility) =>
    facility.facility_type === "MUNICIPALITY" &&
    ((prefix && facility.facility_code.startsWith(`${prefix}-`)) || belongsToRegion(facility, feature.properties.name)),
  );
}

export function ApiMapMonitoringDashboard() {
  const [level, setLevel] = useState<MapLevel>("sido");
  const [parentCode, setParentCode] = useState<string | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);
  const [features, setFeatures] = useState<RegionFeature[]>([]);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [expandedFacilityId, setExpandedFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [boundarySource, setBoundarySource] = useState<"backend" | "public">("backend");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ level });
      if (parentCode) params.set("parent_code", parentCode);
      const [regionResult, facilityResult, wardResult] = await Promise.allSettled([
        getJson<FeatureCollection>(`/gov/map/regions?${params}`),
        getJson<FacilityRow[]>("/api/admin/facilities"),
        getJson<WardSummary[]>("/gov/facility/wards"),
      ]);
      const session = readAdminSession();
      let nextFeatures: RegionFeature[];
      if (regionResult.status === "fulfilled" && regionResult.value.features?.length) {
        nextFeatures = regionResult.value.features;
        setBoundarySource("backend");
      } else {
        nextFeatures = await fetchPublicBoundaries(level, parentCode);
        setBoundarySource("public");
      }
      setFeatures(nextFeatures);
      const sessionMunicipality: FacilityRow[] =
        facilityResult.status === "rejected" &&
        (session?.accessLevel === "MUNICIPALITY_ADMIN" || session?.accessLevel === "MUNICIPALITY_STAFF") &&
        session.facilityId && session.facilityName && session.facilityCode
          ? [{
              facility_id: session.facilityId,
              name: session.facilityName,
              facility_type: "MUNICIPALITY",
              department: session.facilityName,
              facility_code: session.facilityCode,
            }]
          : [];
      setFacilities(facilityResult.status === "fulfilled" ? facilityResult.value : sessionMunicipality);
      setWards(wardResult.status === "fulfilled" ? wardResult.value : []);
      setDataWarning(
        wardResult.status === "rejected"
          ? "대상자 API를 불러오지 못해 대상자 현황을 비워 두었습니다."
          : facilityResult.status === "rejected" && sessionMunicipality.length === 0
            ? "현재 계정으로 시설 목록을 조회할 수 없어 시설 현황을 비워 두었습니다."
            : null,
      );
      setSelectedCode((current) => current && nextFeatures.some((item) => item.properties.code === current) ? current : null);
    } catch (loadError) {
      setFeatures([]);
      setError(loadError instanceof Error ? loadError.message : "지도 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [level, parentCode]);

  useEffect(() => { const id = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(id); }, [load]);

  const projection = useMemo(() => projectMapFeatures(features, (feature) => feature.properties.code), [features]);
  const pathByCode = projection.paths;
  const labelByCode = projection.labels;
  const selectedFeature = features.find((item) => item.properties.code === selectedCode) ?? null;
  const selectedMunicipality = useMemo(() => selectedFeature && level === "sigungu" ? municipalityForRegion(facilities, selectedFeature) : null, [facilities, level, selectedFeature]);
  const selectedFacilities = useMemo(() => {
    if (!selectedFeature || level !== "sigungu") return [];
    return facilities.filter((facility) => facility.facility_type !== "MUNICIPALITY" && (selectedMunicipality ? facility.facility_code.startsWith(`${selectedMunicipality.facility_code}-`) : belongsToRegion(facility, selectedFeature.properties.name)));
  }, [facilities, level, selectedFeature, selectedMunicipality]);
  const wardCountByCode = useMemo(() => {
    const counts = new Map<string, number>();
    wards.forEach((ward) => { if (ward.facility_code) counts.set(ward.facility_code, (counts.get(ward.facility_code) ?? 0) + 1); });
    return counts;
  }, [wards]);
  const selectedWardCount = selectedFacilities.reduce((sum, facility) => sum + (wardCountByCode.get(facility.facility_code) ?? 0), 0);
  const selectedRegionFacilities = selectedFeature ? facilities.filter((facility) => facility.facility_type !== "MUNICIPALITY" && belongsToRegion(facility, selectedFeature.properties.name)) : [];
  const selectedRegionWardCount = selectedRegionFacilities.reduce((sum, facility) => sum + (wardCountByCode.get(facility.facility_code) ?? 0), 0);

  function selectRegion(feature: RegionFeature) {
    setExpandedFacilityId(null);
    setSelectedCode(feature.properties.code);
    if (level === "sido") {
      setParentCode(feature.properties.code);
      setParentName(feature.properties.name);
      setLevel("sigungu");
      setSelectedCode(null);
    }
  }

  function goNational() { setLevel("sido"); setParentCode(null); setParentName(null); setSelectedCode(null); setExpandedFacilityId(null); }

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader title="지도 모니터링" description="시·도와 시·군·구를 선택해 관할 시설 및 대상자 현황을 확인합니다." action={<Badge variant="outline">{boundarySource === "backend" ? "백엔드 지도 경계" : "공개 행정구역 경계"}</Badge>} />
      {dataWarning && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{dataWarning}</div>}
      <section className="grid gap-3 sm:grid-cols-2">
        {[{ label: "전체 시설", value: facilities.filter((item) => item.facility_type !== "MUNICIPALITY").length, unit: "개", icon: Building2, tone: "bg-sky-50 text-sky-600" }, { label: "전체 대상자", value: wards.length, unit: "명", icon: UsersRound, tone: "bg-indigo-50 text-indigo-600" }].map(({ label, value, unit, icon: Icon, tone }) => <Card key={label}><CardContent className="flex items-center justify-between py-1"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-extrabold">{value.toLocaleString()}<span className="ml-1 text-xs text-muted-foreground">{unit}</span></p></div><div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div></CardContent></Card>)}</section>
      <section className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" />{level === "sido" ? "전국 시·도 현황" : `${parentName ?? "선택 지역"} 시·군·구 현황`}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{level === "sido" ? "시·도를 클릭하면 시·군·구 지도로 이동합니다." : "구를 클릭하면 우측에서 구청과 산하시설 현황을 확인할 수 있습니다."}</p></div><div className="flex gap-2">{level === "sigungu" && <Button size="sm" variant="outline" onClick={goNational}><ArrowLeft />전국으로</Button>}<Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />새로고침</Button></div></div></CardHeader>
          <CardContent className="p-0"><div className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/50 to-emerald-50/60 ${level === "sido" ? "min-h-[680px]" : "min-h-[600px]"}`}>{loading ? <div className={`flex items-center justify-center text-sm text-muted-foreground ${level === "sido" ? "h-[680px]" : "h-[600px]"}`}>실제 행정구역 경계를 불러오는 중입니다.</div> : error ? <div className="flex h-[600px] items-center justify-center px-6 text-center text-sm text-destructive">{error}</div> : <svg viewBox="0 0 500 500" className={`mx-auto w-full ${level === "sido" ? "h-[680px] max-w-[860px]" : "h-[600px] max-w-[960px]"}`} role="img" aria-label="대한민국 3D 행정구역 지도"><defs><filter id="apiRegionShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".16" /></filter></defs><g filter="url(#apiRegionShadow)">{features.map((feature) => <path key={`depth-${feature.properties.code}`} d={pathByCode.get(feature.properties.code)} fill="#526174" stroke="#334155" strokeWidth="1" opacity=".42" transform="translate(0 5)" />)}{features.map((feature) => { const active = selectedCode === feature.properties.code; return <path key={feature.properties.code} d={pathByCode.get(feature.properties.code)} fill={active ? "#2f6b55" : "#94a3b8"} stroke={active ? "#ffffff" : "rgba(255,255,255,.82)"} strokeWidth={active ? 3 : 1} transform={active ? "translate(0 -3)" : undefined} className="cursor-pointer transition-all duration-200 hover:fill-slate-500" onClick={() => selectRegion(feature)}><title>{feature.properties.name}</title></path>; })}{features.map((feature) => { const placement = labelByCode.get(feature.properties.code); const name = feature.properties.name; if (!placement || !name) return null; const fontSize = Math.min(level === "sigungu" ? 9 : 11, placement.width / Math.max(name.length * .9, 1), placement.height * .34); if (placement.width < (level === "sido" ? 34 : 24) || fontSize < 5) return null; return <text key={`label-${feature.properties.code}`} x={placement.x} y={placement.y - (selectedCode === feature.properties.code ? 3 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} className="pointer-events-none select-none fill-white font-bold [paint-order:stroke] stroke-black/20 stroke-[1.5px]">{name}</text>; })}</g></svg>}<div className="absolute bottom-4 left-4 rounded-xl border bg-background/90 px-3 py-2 text-xs shadow-sm backdrop-blur"><span className="font-semibold">현재 단계</span><span className="mx-2 text-muted-foreground">전국</span>{parentName && <><span>›</span><span className="ml-2 font-bold text-primary">{parentName}</span></>}</div></div></CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapIcon className="h-5 w-5 text-primary" />{level === "sigungu" ? "구청 및 산하시설" : "선택 지역"}</CardTitle></CardHeader><CardContent className="space-y-5">{selectedFeature ? <><div><Badge variant="outline">{level === "sido" ? "시·도" : "지자체"} · {selectedFeature.properties.code}</Badge><h2 className="mt-2 text-2xl font-extrabold">{selectedMunicipality?.name ?? selectedFeature.properties.name}</h2>{selectedMunicipality && <p className="mt-1 text-xs text-muted-foreground">기관코드 {selectedMunicipality.facility_code}</p>}</div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">관할 시설</p><p className="mt-1 text-2xl font-extrabold">{level === "sigungu" ? selectedFacilities.length : selectedRegionFacilities.length}개</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">관리 대상자</p><p className="mt-1 text-2xl font-extrabold">{level === "sigungu" ? selectedWardCount : selectedRegionWardCount}명</p></div></div>{level === "sigungu" && <div className="space-y-2"><p className="text-sm font-bold">산하시설 목록</p>{selectedFacilities.length ? selectedFacilities.map((facility) => {
          const facilityWards = wards.filter((ward) => ward.facility_code === facility.facility_code);
          const cautionCount = facilityWards.filter((ward) => ward.condition_flags.length > 0).length;
          const expanded = expandedFacilityId === facility.facility_id;
          return <div key={facility.facility_id} className="overflow-hidden rounded-xl border"><button type="button" aria-expanded={expanded} onClick={() => setExpandedFacilityId(expanded ? null : facility.facility_id)} className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/50"><div><p className="font-bold">{facility.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{FACILITY_TYPE_LABEL[facility.facility_type]}</p></div><div className="flex items-center gap-2"><div className="text-right"><p className="text-lg font-extrabold">{facilityWards.length}명</p><p className="text-[11px] text-muted-foreground">대상자</p></div><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} /></div></button>{expanded && <div className="grid grid-cols-3 gap-2 border-t bg-muted/30 p-3"><div className="rounded-lg bg-background p-2.5 text-center"><UsersRound className="mx-auto h-4 w-4 text-indigo-600" /><p className="mt-1 text-lg font-extrabold">{facilityWards.length}</p><p className="text-[11px] text-muted-foreground">전체 대상자</p></div><div className="rounded-lg bg-background p-2.5 text-center"><AlertTriangle className="mx-auto h-4 w-4 text-amber-600" /><p className="mt-1 text-lg font-extrabold">{cautionCount}</p><p className="text-[11px] text-muted-foreground">건강 주의</p></div><div className="rounded-lg bg-background p-2.5 text-center"><UtensilsCrossed className="mx-auto h-4 w-4 text-slate-500" /><p className="mt-1 text-lg font-extrabold">—</p><p className="text-[11px] text-muted-foreground">미섭취</p></div><p className="col-span-3 text-center text-[11px] text-muted-foreground">미섭취는 시설별 식사 집계 API 연결 후 표시됩니다.</p></div>}</div>;
        }) : <div className="rounded-xl bg-muted p-4 text-center text-sm text-muted-foreground">등록된 산하시설이 없습니다.</div>}</div>}</> : <p className="py-16 text-center text-sm text-muted-foreground">지도에서 지역을 선택해 주세요.</p>}</CardContent></Card>
      </section>
    </main>
  );
}
