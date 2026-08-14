"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CircleAlert,
  Clock3,
  Map as MapIcon,
  MapPinned,
  UsersRound,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readAdminSession } from "@/lib/admin-auth";

type MapLevel = "sido" | "sigungu";
type Position = [number, number];
type GeoGeometry = { type: "Polygon"; coordinates: Position[][] } | { type: "MultiPolygon"; coordinates: Position[][][] };
type GeoFeature = { type: "Feature"; properties: Record<string, string>; geometry: GeoGeometry };
type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };
type LabelPlacement = { x: number; y: number; width: number; height: number };

type MockRegion = {
  code: string;
  name: string;
  path: string;
  value: number;
  intensity: number;
  facilities: number;
  residents: number;
  caution: number;
  danger: number;
  noResponse: number;
};

const SIDO_REGIONS: MockRegion[] = [
  { code: "11", name: "서울", path: "M145 73 L190 55 224 76 215 112 174 126 137 105Z", value: 198021, intensity: .94, facilities: 8, residents: 289, caution: 28, danger: 9, noResponse: 14 },
  { code: "28", name: "인천", path: "M87 90 L127 72 137 106 115 137 78 126Z", value: 121540, intensity: .61, facilities: 4, residents: 122, caution: 11, danger: 3, noResponse: 8 },
  { code: "41", name: "경기", path: "M127 137 L137 105 174 126 215 112 251 137 240 188 192 204 147 181Z", value: 230420, intensity: 1, facilities: 11, residents: 381, caution: 35, danger: 12, noResponse: 18 },
  { code: "42", name: "강원", path: "M224 76 L282 70 341 99 315 153 251 137 215 112Z", value: 74630, intensity: .37, facilities: 5, residents: 156, caution: 13, danger: 4, noResponse: 7 },
  { code: "43", name: "충북", path: "M192 204 L240 188 270 224 252 267 205 258 174 227Z", value: 89340, intensity: .44, facilities: 4, residents: 138, caution: 12, danger: 4, noResponse: 6 },
  { code: "44", name: "충남", path: "M114 179 L147 181 192 204 174 227 205 258 167 281 110 258 88 216Z", value: 105210, intensity: .52, facilities: 5, residents: 174, caution: 16, danger: 5, noResponse: 9 },
  { code: "30", name: "대전", path: "M167 231 L190 235 187 259 164 258Z", value: 69020, intensity: .34, facilities: 3, residents: 91, caution: 7, danger: 2, noResponse: 4 },
  { code: "47", name: "경북", path: "M270 224 L315 153 359 178 377 238 345 284 291 281 252 267Z", value: 131880, intensity: .65, facilities: 6, residents: 203, caution: 19, danger: 7, noResponse: 10 },
  { code: "45", name: "전북", path: "M110 258 L167 281 205 258 224 302 193 333 127 326 91 293Z", value: 92750, intensity: .46, facilities: 4, residents: 149, caution: 14, danger: 4, noResponse: 7 },
  { code: "46", name: "전남", path: "M91 293 L127 326 193 333 211 367 170 403 109 387 65 348Z", value: 81620, intensity: .40, facilities: 5, residents: 162, caution: 17, danger: 6, noResponse: 11 },
  { code: "29", name: "광주", path: "M113 325 L145 327 143 353 111 352Z", value: 61200, intensity: .30, facilities: 3, residents: 88, caution: 8, danger: 2, noResponse: 5 },
  { code: "48", name: "경남", path: "M224 302 L291 281 326 316 306 360 250 375 211 367 193 333Z", value: 142300, intensity: .70, facilities: 7, residents: 226, caution: 21, danger: 7, noResponse: 12 },
  { code: "26", name: "부산", path: "M306 360 L342 343 363 370 338 397 304 389Z", value: 118400, intensity: .58, facilities: 5, residents: 171, caution: 15, danger: 5, noResponse: 8 },
  { code: "31", name: "울산", path: "M326 316 L365 302 381 331 342 343Z", value: 58700, intensity: .29, facilities: 2, residents: 67, caution: 5, danger: 1, noResponse: 3 },
  { code: "27", name: "대구", path: "M291 281 L329 270 343 298 326 316Z", value: 101200, intensity: .50, facilities: 4, residents: 130, caution: 12, danger: 3, noResponse: 6 },
  { code: "36", name: "세종", path: "M146 177 L169 172 178 197 153 203Z", value: 32200, intensity: .16, facilities: 1, residents: 34, caution: 2, danger: 0, noResponse: 1 },
  { code: "50", name: "제주", path: "M131 439 C154 424 205 425 229 440 C209 461 154 467 126 451Z", value: 40500, intensity: .20, facilities: 2, residents: 58, caution: 4, danger: 1, noResponse: 2 },
];

const SEOUL_DISTRICTS: MockRegion[] = [
  { code: "11320", name: "도봉구", path: "M245 34 L280 24 301 73 278 105 246 86Z", value: 4.7, intensity: .33, facilities: 1, residents: 39, caution: 3, danger: 1, noResponse: 2 },
  { code: "11350", name: "노원구", path: "M280 24 L326 35 343 91 313 126 278 105 301 73Z", value: 6.8, intensity: .48, facilities: 2, residents: 66, caution: 6, danger: 1, noResponse: 4 },
  { code: "11305", name: "강북구", path: "M214 51 L245 34 246 86 278 105 257 128 221 112Z", value: 5.2, intensity: .37, facilities: 1, residents: 44, caution: 4, danger: 1, noResponse: 3 },
  { code: "11290", name: "성북구", path: "M221 112 L257 128 313 126 324 154 264 176 226 153Z", value: 5.8, intensity: .41, facilities: 2, residents: 61, caution: 5, danger: 1, noResponse: 3 },
  { code: "11260", name: "중랑구", path: "M313 126 L354 112 379 151 352 196 324 154Z", value: 6.1, intensity: .43, facilities: 2, residents: 63, caution: 6, danger: 1, noResponse: 4 },
  { code: "11230", name: "동대문구", path: "M264 176 L324 154 352 196 320 214 280 205Z", value: 5.5, intensity: .39, facilities: 1, residents: 48, caution: 4, danger: 1, noResponse: 3 },
  { code: "11380", name: "은평구", path: "M126 72 L177 54 214 51 221 112 177 111 151 153 107 133Z", value: 7.7, intensity: .54, facilities: 2, residents: 69, caution: 7, danger: 2, noResponse: 4 },
  { code: "11410", name: "서대문구", path: "M151 153 L177 111 221 112 226 153 202 193Z", value: 6.4, intensity: .45, facilities: 2, residents: 57, caution: 5, danger: 1, noResponse: 3 },
  { code: "11500", name: "강서구", path: "M38 174 L107 133 151 153 142 219 83 241 38 211Z", value: 12.4, intensity: .82, facilities: 3, residents: 96, caution: 11, danger: 4, noResponse: 8 },
  { code: "11470", name: "양천구", path: "M83 241 L142 219 166 252 143 296 89 287Z", value: 7.1, intensity: .51, facilities: 2, residents: 62, caution: 5, danger: 1, noResponse: 4 },
  { code: "11440", name: "마포구", path: "M107 133 L177 111 221 147 202 193 151 153Z", value: 9.8, intensity: .69, facilities: 2, residents: 73, caution: 8, danger: 3, noResponse: 5 },
  { code: "11530", name: "구로구", path: "M89 287 L143 296 179 326 137 362 77 338Z", value: 8.2, intensity: .58, facilities: 2, residents: 68, caution: 7, danger: 2, noResponse: 5 },
  { code: "11560", name: "영등포구", path: "M143 296 L166 252 219 249 225 303 179 326Z", value: 5.4, intensity: .39, facilities: 2, residents: 59, caution: 4, danger: 1, noResponse: 3 },
  { code: "11110", name: "종로구", path: "M177 111 L245 84 279 129 264 176 221 147Z", value: 4.8, intensity: .34, facilities: 1, residents: 41, caution: 3, danger: 1, noResponse: 2 },
  { code: "11140", name: "중구", path: "M202 193 L226 153 264 176 267 221 219 213Z", value: 3.6, intensity: .25, facilities: 1, residents: 32, caution: 2, danger: 0, noResponse: 2 },
  { code: "11170", name: "용산구", path: "M202 193 L219 213 267 221 254 254 219 249 166 252Z", value: 4.3, intensity: .30, facilities: 1, residents: 38, caution: 3, danger: 1, noResponse: 2 },
  { code: "11200", name: "성동구", path: "M264 176 L324 154 352 196 320 231 267 221Z", value: 3.2, intensity: .22, facilities: 2, residents: 71, caution: 4, danger: 0, noResponse: 2 },
  { code: "11215", name: "광진구", path: "M320 196 L379 151 397 196 383 218 320 231Z", value: 4.9, intensity: .35, facilities: 1, residents: 43, caution: 3, danger: 1, noResponse: 2 },
  { code: "11680", name: "강남구", path: "M267 221 L320 231 350 282 311 330 254 300Z", value: 10.9, intensity: .76, facilities: 3, residents: 108, caution: 13, danger: 5, noResponse: 7 },
  { code: "11710", name: "송파구", path: "M320 231 L383 218 417 269 378 322 311 330 350 282Z", value: 6.3, intensity: .45, facilities: 2, residents: 79, caution: 6, danger: 1, noResponse: 4 },
  { code: "11740", name: "강동구", path: "M383 218 L432 178 464 222 441 274 417 269Z", value: 4.1, intensity: .28, facilities: 1, residents: 45, caution: 3, danger: 0, noResponse: 2 },
  { code: "11590", name: "동작구", path: "M179 326 L225 303 254 300 272 344 224 365Z", value: 6.7, intensity: .47, facilities: 2, residents: 64, caution: 6, danger: 1, noResponse: 4 },
  { code: "11620", name: "관악구", path: "M137 362 L179 326 224 365 218 414 166 423 126 396Z", value: 8.6, intensity: .60, facilities: 2, residents: 76, caution: 8, danger: 2, noResponse: 5 },
  { code: "11650", name: "서초구", path: "M224 365 L272 344 311 330 340 374 303 423 248 415 218 414Z", value: 7.4, intensity: .52, facilities: 2, residents: 72, caution: 6, danger: 2, noResponse: 4 },
  { code: "11545", name: "금천구", path: "M77 338 L137 362 126 396 88 404 61 371Z", value: 5.9, intensity: .42, facilities: 1, residents: 46, caution: 4, danger: 1, noResponse: 3 },
];

const GEOJSON_URL: Record<MapLevel, string> = {
  sido: "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json",
  sigungu: "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json",
};

function geoCode(feature: GeoFeature): string {
  return String(feature.properties.code ?? feature.properties.adm_cd ?? feature.properties.CTPRVN_CD ?? feature.properties.SIG_CD ?? "");
}

function geoName(feature: GeoFeature): string {
  return String(feature.properties.name ?? feature.properties.name_eng ?? feature.properties.CTP_KOR_NM ?? feature.properties.SIG_KOR_NM ?? "");
}

const SIDO_SHORT_NAME: Record<string, string> = {
  서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종",
  경기도: "경기", 강원도: "강원", 강원특별자치도: "강원", 충청북도: "충북",
  충청남도: "충남", 전라북도: "전북", 전북특별자치도: "전북", 전라남도: "전남",
  경상북도: "경북", 경상남도: "경남", 제주특별자치도: "제주",
};

function matchRegion(feature: GeoFeature, regions: MockRegion[]): MockRegion | undefined {
  const code = geoCode(feature);
  const name = geoName(feature);
  const shortName = SIDO_SHORT_NAME[name] ?? name;
  return regions.find((item) => item.code === code || item.name === shortName || name.includes(item.name));
}

function geometryRings(geometry: GeoGeometry): Position[][] {
  return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
}

function projectGeoFeatures(features: GeoFeature[]): Map<GeoFeature, string> {
  const points = features.flatMap((feature) => geometryRings(feature.geometry).flat());
  if (!points.length) return new Map();
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  // 전국/서울/구 모두 같은 규칙으로 실제 경계 전체를 500×500 캔버스 안에 맞춘다.
  // x/y에 서로 다른 배율을 쓰지 않아 실제 지도 종횡비가 찌그러지지 않는다.
  const padding = 28;
  const drawableSize = 500 - padding * 2;
  const scale = Math.min(
    drawableSize / Math.max(maxX - minX, Number.EPSILON),
    drawableSize / Math.max(maxY - minY, Number.EPSILON),
  );
  const offsetX = (500 - (maxX - minX) * scale) / 2;
  const offsetY = (500 - (maxY - minY) * scale) / 2;
  return new Map(features.map((feature) => [feature, geometryRings(feature.geometry).map((ring) => ring.map(([x, y], index) => `${index ? "L" : "M"}${offsetX + (x - minX) * scale} ${500 - offsetY - (y - minY) * scale}`).join(" ") + " Z").join(" ")]));
}

function projectGeoLabels(features: GeoFeature[]): Map<GeoFeature, LabelPlacement> {
  const points = features.flatMap((feature) => geometryRings(feature.geometry).flat());
  if (!points.length) return new Map();
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const padding = 28;
  const drawableSize = 500 - padding * 2;
  const scale = Math.min(
    drawableSize / Math.max(maxX - minX, Number.EPSILON),
    drawableSize / Math.max(maxY - minY, Number.EPSILON),
  );
  const offsetX = (500 - (maxX - minX) * scale) / 2;
  const offsetY = (500 - (maxY - minY) * scale) / 2;
  return new Map(features.map((feature) => {
    const featurePoints = geometryRings(feature.geometry).flat();
    const featureXs = featurePoints.map(([x]) => x), featureYs = featurePoints.map(([, y]) => y);
    const centerX = (Math.min(...featureXs) + Math.max(...featureXs)) / 2;
    const centerY = (Math.min(...featureYs) + Math.max(...featureYs)) / 2;
    return [feature, {
      x: offsetX + (centerX - minX) * scale,
      y: 500 - offsetY - (centerY - minY) * scale,
      width: (Math.max(...featureXs) - Math.min(...featureXs)) * scale,
      height: (Math.max(...featureYs) - Math.min(...featureYs)) * scale,
    }];
  }));
}

export function MapMonitoringDashboard() {
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [level, setLevel] = useState<MapLevel>("sido");
  const [parentRegion, setParentRegion] = useState<MockRegion | null>(null);
  const [selectedCode, setSelectedCode] = useState("11");
  const [geoFeatures, setGeoFeatures] = useState<GeoFeature[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = readAdminSession();
      setAccessLevel(session?.accessLevel ?? null);
      if (session?.accessLevel && session.accessLevel !== "SUPER_ADMIN") {
        setParentRegion(SIDO_REGIONS[0]);
        setLevel("sigungu");
        setSelectedCode("11500");
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setMapLoading(true);
      setMapError(null);
      fetch(GEOJSON_URL[level])
      .then((response) => {
        if (!response.ok) throw new Error(`행정구역 지도 파일을 불러오지 못했습니다. (${response.status})`);
        return response.json() as Promise<GeoCollection>;
      })
      .then((collection) => {
        if (cancelled) return;
        const next = level === "sigungu"
          ? collection.features.filter((feature) => geoCode(feature).startsWith("11") || geoName(feature).includes("서울"))
          : collection.features;
        setGeoFeatures(next);
      })
      .catch((loadError) => {
        if (!cancelled) setMapError(loadError instanceof Error ? loadError.message : "행정구역 지도를 불러오지 못했습니다.");
      })
      .finally(() => { if (!cancelled) setMapLoading(false); });
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timeoutId); };
  }, [level]);

  const regions = level === "sido" ? SIDO_REGIONS : SEOUL_DISTRICTS;
  const selected = regions.find((region) => region.code === selectedCode) ?? regions[0] ?? null;
  const projectedFeatures = useMemo(() => projectGeoFeatures(geoFeatures), [geoFeatures]);
  const projectedLabels = useMemo(() => projectGeoLabels(geoFeatures), [geoFeatures]);
  const totals = useMemo(
    () => regions.reduce((sum, item) => ({ facilities: sum.facilities + item.facilities, residents: sum.residents + item.residents, danger: sum.danger + item.danger, noResponse: sum.noResponse + item.noResponse }), { facilities: 0, residents: 0, danger: 0, noResponse: 0 }),
    [regions],
  );

  function drillDown(region: MockRegion) {
    setSelectedCode(region.code);
    if (level === "sido" && region.code === "11") {
      setParentRegion(region);
      setLevel("sigungu");
      setSelectedCode("11500");
    }
  }

  function goNational() {
    setLevel("sido");
    setParentRegion(null);
    setSelectedCode("11");
  }

  const selectedFacilities = useMemo(() => {
    if (level !== "sigungu" || !selected) return [];
    const seed = [...selected.code].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const count = 2 + seed % 3;
    const suffixes = ["어르신복지관", "행복요양원", "통합돌봄센터", "시니어케어센터"];
    return Array.from({ length: count }, (_, index) => ({
      id: `${selected.code}-${index + 1}`,
      name: `${selected.name.replace(/구$/, "")}${suffixes[index]}`,
      type: index % 2 === 0 ? "사회복지기관" : "요양원",
      wardCount: 18 + (seed * (index + 3)) % 39,
    }));
  }, [level, selected]);
  const selectedFacilityWardTotal = selectedFacilities.reduce((sum, facility) => sum + facility.wardCount, 0);

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title="지도 모니터링"
        description="전국에서 시·도, 시·군·구로 이동하며 지역별 건강 및 서비스 현황을 확인합니다."
        action={<Badge variant="secondary">API 명세 기반 목 데이터</Badge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "관할 시설", value: totals.facilities, unit: "개", icon: Building2, tone: "bg-sky-50 text-sky-600" },
          { label: "관리 대상자", value: totals.residents, unit: "명", icon: UsersRound, tone: "bg-indigo-50 text-indigo-600" },
          { label: "조회 시·도", value: SIDO_REGIONS.length, unit: "개", icon: CircleAlert, tone: "bg-emerald-50 text-emerald-600" },
          { label: "서울 자치구", value: SEOUL_DISTRICTS.length, unit: "개", icon: Clock3, tone: "bg-slate-100 text-slate-600" },
        ].map(({ label, value, unit, icon: Icon, tone }) => (
          <Card key={label}><CardContent className="flex items-center justify-between py-1"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-extrabold">{value.toLocaleString()}<span className="ml-1 text-xs text-muted-foreground">{unit}</span></p></div><div className={`rounded-xl p-3 ${tone}`}><Icon className="h-5 w-5" /></div></CardContent></Card>
        ))}
      </section>

      <section className="grid min-h-[620px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" /> {level === "sido" ? "전국 시·도 현황" : `${parentRegion?.name ?? "서울"} 시·군·구 현황`}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{level === "sido" ? "시·도를 클릭하면 시·군·구 지도로 이동합니다." : "구를 클릭하면 우측에서 구청 요약과 산하시설을 확인할 수 있습니다."}</p></div>{level === "sigungu" && accessLevel === "SUPER_ADMIN" && <Button variant="outline" size="sm" onClick={goNational}><ArrowLeft /> 전국으로</Button>}</div>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`relative overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/50 to-emerald-50/60 ${level === "sido" ? "min-h-[680px]" : "min-h-[600px]"}`}>
              {mapLoading ? <div className={`flex items-center justify-center text-sm text-muted-foreground ${level === "sido" ? "h-[680px]" : "h-[600px]"}`}>실제 행정구역 경계를 불러오는 중입니다.</div> : mapError ? <div className={`flex items-center justify-center px-6 text-center text-sm text-destructive ${level === "sido" ? "h-[680px]" : "h-[600px]"}`}>{mapError}</div> : <svg viewBox="0 0 500 500" className={`mx-auto w-full ${level === "sido" ? "h-[680px] max-w-[860px]" : "h-[600px] max-w-[960px]"}`} role="img" aria-label="대한민국 3D 행정구역 지도"><defs><filter id="regionShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodOpacity=".16" /></filter></defs><g filter="url(#regionShadow)">{geoFeatures.map((feature) => { const code = geoCode(feature); const name = geoName(feature); return <path key={`depth-${code}-${name}`} d={projectedFeatures.get(feature)} fill="#526174" stroke="#334155" strokeWidth="1" opacity=".42" transform="translate(0 5)" />; })}{geoFeatures.map((feature) => { const code = geoCode(feature); const name = geoName(feature); const region = matchRegion(feature, regions); const active = region?.code === selected?.code; return <g key={`${code}-${name}`} transform={active ? "translate(0 -3)" : undefined} className="transition-transform duration-200"><path d={projectedFeatures.get(feature)} fill={active ? "#2f6b55" : "#94a3b8"} stroke={active ? "#ffffff" : "rgba(255,255,255,.82)"} strokeWidth={active ? 3 : 1} className="cursor-pointer transition-all duration-200 hover:fill-slate-500" onClick={() => region && drillDown({ ...region, code, name: name || region.name })} onMouseEnter={() => region && setSelectedCode(region.code)}><title>{name || region?.name || code}</title></path></g>; })}{geoFeatures.map((feature) => { const placement = projectedLabels.get(feature); const rawName = geoName(feature); const region = matchRegion(feature, regions); const label = level === "sido" ? (region?.name ?? SIDO_SHORT_NAME[rawName] ?? rawName) : rawName; if (!placement || !label) return null; const levelMax = level === "sigungu" ? 9 : 11; const fontSize = Math.min(levelMax, placement.width / Math.max(label.length * .9, 1), placement.height * .34); const minimumWidth = level === "sido" ? 34 : 24; if (placement.width < minimumWidth || fontSize < 5) return null; return <text key={`label-${geoCode(feature)}-${label}`} x={placement.x} y={placement.y - (selected?.code === region?.code ? 3 : 0)} textAnchor="middle" dominantBaseline="middle" fontSize={fontSize} className="pointer-events-none select-none fill-white font-bold [paint-order:stroke] stroke-black/20 stroke-[1.5px]">{label}</text>; })}</g></svg>}
              <div className="absolute bottom-4 left-4 rounded-xl border bg-background/90 px-3 py-2 text-xs shadow-sm backdrop-blur"><span className="font-semibold">현재 단계</span><span className="mx-2 text-muted-foreground">전국</span>{parentRegion && <><span>›</span><span className="ml-2 font-bold text-primary">{parentRegion.name}</span></>}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MapIcon className="h-5 w-5 text-primary" /> {level === "sigungu" ? "구청 및 산하시설" : "선택 지역"}</CardTitle></CardHeader>
          <CardContent className="space-y-5">{selected ? <>
            <div><Badge variant="outline">{level === "sido" ? "시·도" : "지자체"} · {selected.code}</Badge><h2 className="mt-2 text-2xl font-extrabold">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{level === "sigungu" ? `${selected.name}청 관할 운영 현황` : "행정구역 및 관할시설 현황"}</p></div>
            {level === "sido" ? <><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">관할 시설</p><p className="mt-1 text-2xl font-extrabold">{selected.facilities}개</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">관리 대상자</p><p className="mt-1 text-2xl font-extrabold">{selected.residents}명</p></div></div>{selected.code === "11" && <Button className="w-full" onClick={() => drillDown(selected)}>서울 시·군·구 보기</Button>}</> : <><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">관리 산하시설</p><p className="mt-1 text-2xl font-extrabold">{selectedFacilities.length}개</p></div><div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">전체 대상자</p><p className="mt-1 text-2xl font-extrabold">{selectedFacilityWardTotal}명</p></div></div><div className="space-y-2"><p className="text-sm font-bold">산하시설 목록</p>{selectedFacilities.map((facility) => <button key={facility.id} type="button" className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"><div><p className="font-bold">{facility.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{facility.type}</p></div><div className="text-right"><p className="text-lg font-extrabold">{facility.wardCount}명</p><p className="text-[11px] text-muted-foreground">대상자</p></div></button>)}</div></>}
            </> : <p className="py-16 text-center text-sm text-muted-foreground">지도에서 지역을 선택해 주세요.</p>}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
