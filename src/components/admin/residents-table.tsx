"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Download, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  Resident,
  RiskLevel,
} from "@/lib/admin-residents";
import {
  ACTIVITY_LEVEL_OPTIONS,
  CONDITION_OPTIONS,
  makeFoodRules,
  splitItems,
  type ActivityLevel,
  type ConditionFlag,
} from "@/lib/admin-ward-registration";
import { readAdminSession } from "@/lib/admin-auth";
import { createFacilityWard, updateFacilityWardHealthProfile } from "@/lib/admin-wards-api";
import { getJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RISK_BADGE_CLASS: Record<RiskLevel, string> = {
  고위험: "bg-risk-high text-risk-high-foreground",
  주의: "bg-risk-caution text-risk-caution-foreground",
  보통: "bg-risk-normal text-risk-normal-foreground",
};

const RESPONSE_TONE_CLASS: Record<Resident["lastResponseTone"], string> = {
  danger: "font-semibold text-destructive",
  warning: "font-semibold text-risk-caution-foreground",
  neutral: "text-muted-foreground",
};

const PAGE_SIZE = 8;
type SortKey = "no" | "age" | "risk";

const RISK_ORDER: Record<RiskLevel, number> = { 고위험: 0, 주의: 1, 보통: 2 };

type CareFacilityOption = {
  facility_id: string;
  name: string;
  facility_code: string;
  facility_type: "MUNICIPALITY" | "NURSING_HOME" | "WELFARE_CENTER";
};

export function ResidentsTable({
  data,
  initialRisk = "all",
}: {
  data: Resident[];
  initialRisk?: RiskLevel | "all";
}) {
  const router = useRouter();
  const [residents, setResidents] = useState(data);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">(initialRisk);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("no");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [canRegister, setCanRegister] = useState(false);
  const [requiresFacilitySelection, setRequiresFacilitySelection] = useState(false);
  const [facilityCode, setFacilityCode] = useState("");
  const [careFacilities, setCareFacilities] = useState<CareFacilityOption[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = readAdminSession();
      setCanRegister(
        session?.accessLevel === "CARE_FACILITY_ADMIN" ||
          session?.accessLevel === "SUPER_ADMIN" ||
          session?.accessLevel === "MUNICIPALITY_ADMIN" ||
          session?.accessLevel === "MUNICIPALITY_STAFF",
      );
      setRequiresFacilitySelection(
        session?.accessLevel === "SUPER_ADMIN" ||
          session?.accessLevel === "MUNICIPALITY_ADMIN" ||
          session?.accessLevel === "MUNICIPALITY_STAFF",
      );
      setFacilityCode(session?.careFacilityCode ?? session?.facilityCode ?? "");
      if (
        session?.accessLevel === "SUPER_ADMIN" ||
        session?.accessLevel === "MUNICIPALITY_ADMIN" ||
        session?.accessLevel === "MUNICIPALITY_STAFF"
      ) {
        void getJson<CareFacilityOption[]>("/api/admin/facilities")
          .then((items) => setCareFacilities(items.filter((item) => item.facility_type !== "MUNICIPALITY")))
          .catch(() => setCareFacilities([]));
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [data]);

  const filtered = useMemo(() => {
    let rows = residents;
    if (riskFilter !== "all") rows = rows.filter((r) => r.risk === riskFilter);
    if (search.trim()) {
      const q = search.trim();
      rows = rows.filter(
        (r) =>
          r.name.includes(q) ||
          r.facilityCode?.includes(q) ||
          (r.address ?? r.dong).includes(q),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let diff = 0;
      if (sortKey === "no") {
        diff = (a.displayId ?? a.id).localeCompare(b.displayId ?? b.id);
      }
      if (sortKey === "age") diff = a.age - b.age;
      if (sortKey === "risk") diff = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [residents, riskFilter, search, sortKey, sortAsc]);

  function registerResident(resident: Resident) {
    setResidents((current) => [...current, resident]);
    setRegisterOpen(false);
    setPage(1);
    toast.success(`${resident.name} 대상자를 등록했습니다.`);
    router.push(`/admin/residents/${resident.id}`);
  }

  function getNextResidentId(facilityCode: string) {
    return String(
      residents
        .filter((resident) => (resident.facilityCode ?? "") === facilityCode.trim())
        .reduce((largest, resident) => {
      const displayId = resident.displayId ?? resident.id;
      const id = /^\d+$/.test(displayId) ? Number(displayId) : 0;
      return Math.max(largest, id);
        }, 0) + 1,
    ).padStart(3, "0");
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  }

  function exportCsv() {
    const header = [
      "번호",
      "성명",
      "기관코드",
      "나이",
      "주소지",
      "주요 질환",
      "최근 응답",
      "위험도",
    ];
    const rows = filtered.map((r) => [
      r.displayId ?? r.id,
      r.name,
      r.facilityCode ?? "미지정",
      String(r.age),
      r.address ?? r.dong,
      r.condition,
      r.lastResponse,
      r.risk,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grandfood-대상자명단-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">
              대상자 명단
            </h1>
            <p className="text-sm text-muted-foreground">
              관내 급식 지원 어르신 {residents.length}명 · 오늘 기준
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRegisterOpen(true)}
              disabled={!canRegister}
              title={canRegister ? "대상자 등록" : "현재 권한으로는 대상자를 등록할 수 없습니다."}
            >
              <Plus />
              대상자 등록
            </Button>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="이름·기관코드·주소 검색"
                className="w-40 pl-8"
              />
            </div>
            <Select
              value={riskFilter}
              onValueChange={(v) => {
                setRiskFilter(v as RiskLevel | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="위험도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">위험도 전체</SelectItem>
                <SelectItem value="고위험">고위험</SelectItem>
                <SelectItem value="주의">주의</SelectItem>
                <SelectItem value="보통">보통</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportCsv} size="sm">
              <Download />
              CSV 내보내기
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="전체 대상자"
            value={String(residents.length)}
          />
          <StatCard
            label="고위험군"
            value={String(residents.filter((r) => r.risk === "고위험").length)}
            tone="danger"
          />
          <StatCard
            label="3일 이상 미응답"
            value={String(
              residents.filter((r) => r.lastResponseTone === "danger").length
            )}
            tone="danger"
          />
          <StatCard
            label="검진 갱신 필요"
            value={String(Math.round(residents.length * 0.06))}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="번호"
                active={sortKey === "no"}
                asc={sortAsc}
                onClick={() => toggleSort("no")}
              />
              <TableHead>성명</TableHead>
              <TableHead>기관코드</TableHead>
              <SortableHead
                label="나이"
                active={sortKey === "age"}
                asc={sortAsc}
                onClick={() => toggleSort("age")}
              />
              <TableHead>주소지</TableHead>
              <TableHead>주요 질환</TableHead>
              <TableHead>최근 응답</TableHead>
              <SortableHead
                label="위험도"
                active={sortKey === "risk"}
                asc={sortAsc}
                onClick={() => toggleSort("risk")}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  조건에 맞는 대상자가 없어요.
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/residents/${r.id}`)}
              >
                <TableCell className="text-muted-foreground">{r.displayId ?? r.id}</TableCell>
                <TableCell className="font-semibold text-foreground">
                  {r.name}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.facilityCode ?? "미지정"}
                </TableCell>
                <TableCell>{r.age}</TableCell>
                <TableCell>{r.address ?? r.dong}</TableCell>
                <TableCell>{r.condition}</TableCell>
                <TableCell className={RESPONSE_TONE_CLASS[r.lastResponseTone]}>
                  {r.lastResponse}
                </TableCell>
                <TableCell>
                  <Badge className={RISK_BADGE_CLASS[r.risk]}>{r.risk}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            {filtered.length}명 중{" "}
            {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} 표시 · 개인정보
            열람 시 사유 입력 필요
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      </div>
      <RegisterResidentDialog
        open={registerOpen}
        facilityCode={facilityCode}
        facilities={careFacilities}
        requiresFacilitySelection={requiresFacilitySelection}
        nextResidentId={getNextResidentId(facilityCode)}
        onClose={() => setRegisterOpen(false)}
        onRegister={registerResident}
      />
    </div>
  );
}

function RegisterResidentDialog({
  open,
  facilityCode,
  facilities,
  requiresFacilitySelection,
  nextResidentId,
  onClose,
  onRegister,
}: {
  open: boolean;
  facilityCode: string;
  facilities: CareFacilityOption[];
  requiresFacilitySelection: boolean;
  nextResidentId: string;
  onClose: () => void;
  onRegister: (resident: Resident) => void;
}) {
  const [gender, setGender] = useState<"여" | "남">("여");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("sedentary");
  const [conditionFlags, setConditionFlags] = useState<ConditionFlag[]>([]);
  const [mealsPerDay, setMealsPerDay] = useState<1 | 2 | 3 | 4>(3);
  const [chewingDifficulty, setChewingDifficulty] = useState(false);
  const [mobilityLevel, setMobilityLevel] = useState<"independent" | "needs_assistance" | "bedridden">("independent");
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresFacilitySelection && !selectedFacilityId) {
      toast.error("대상자를 등록할 산하시설을 선택해 주세요.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const birthDate = String(form.get("birthDate") ?? "");
    const phone = String(form.get("phone") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const heightCm = Number(form.get("heightCm"));
    const weightKg = Number(form.get("weightKg"));
    const conditionsNote = String(form.get("conditionsNote") ?? "").trim();
    const allergies = splitItems(form.get("allergies"));
    const dislikedIngredients = splitItems(form.get("dislikedIngredients"));
    const restrictions = splitItems(form.get("restrictions"));
    const medications = String(form.get("medications") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [name, ...scheduleParts] = item.split("/");
        return {
          name: name.trim(),
          schedule: scheduleParts.join("/").trim() || "-",
        };
      });
    const guardianName = String(form.get("guardianName") ?? "").trim();
    const guardianPhone = String(form.get("guardianPhone") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();

    if (!name || !birthDate || !phone || !address || !heightCm || !weightKg || submitting) return;

    const foodRules = makeFoodRules(allergies, dislikedIngredients, restrictions);
    const medicationsNote = String(form.get("medications") ?? "").trim();

    setSubmitting(true);
    try {
      const resident = await createFacilityWard({
        care_facility_id: requiresFacilitySelection ? selectedFacilityId : null,
        name,
        birth_date: birthDate,
        gender: gender === "남" ? "male" : "female",
        phone,
        address,
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_level: activityLevel,
        condition_flags: conditionFlags,
        conditions_note: conditionsNote || null,
        food_rules: foodRules,
        guardian_name: guardianName || null,
        guardian_phone: guardianPhone || null,
        medications_note: medicationsNote || null,
        note: note || null,
      });
      try {
        await updateFacilityWardHealthProfile(resident.id, {
          checkup_date: new Date().toISOString().slice(0, 10),
          meals_per_day: mealsPerDay,
          chewing_difficulty: chewingDifficulty,
          mobility_level: mobilityLevel,
        });
      } catch {
        toast.warning("대상자는 등록됐지만 생활정보 저장에 실패했습니다. 상세 화면에서 다시 저장해 주세요.");
      }
      onRegister({
        ...resident,
        displayId: nextResidentId,
        facilityCode: resident.facilityCode ?? facilityCode,
        allergies,
        medications,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "대상자를 등록하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resident-register-title"
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-card shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-6 py-5 sm:px-8">
          <div>
            <h2 id="resident-register-title" className="text-xl font-bold">
              대상자 등록
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              급식 지원 대상자의 기본 정보를 입력해 주세요.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
            <span className="sr-only">닫기</span>
          </Button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6 sm:px-8">
          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
            <span className="text-muted-foreground">자동 부여 대상자 번호</span>
            <span className="font-mono font-bold text-foreground">
              {nextResidentId}
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resident-name">
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input id="resident-name" name="name" placeholder="대상자 이름" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-birth-date">
                생년월일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resident-birth-date"
                name="birthDate"
                type="date"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-gender">
                성별 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={gender}
                onValueChange={(value) => setGender((value as "여" | "남") ?? "여")}
              >
                <SelectTrigger id="resident-gender" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="여">여</SelectItem>
                  <SelectItem value="남">남</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-phone">
                대상자 연락처 <span className="text-destructive">*</span>
              </Label>
              <Input id="resident-phone" name="phone" type="tel" placeholder="010-0000-0000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-address">
                주소지 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resident-address"
                name="address"
                placeholder="예: 서울특별시 강서구 화곡로 123"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>소속 기관</Label>
              {requiresFacilitySelection ? (
                <Select
                  value={selectedFacilityId}
                  onValueChange={(value) => setSelectedFacilityId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="대상자를 등록할 산하시설을 선택해 주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.facility_id} value={facility.facility_id}>
                        {facility.name} ({facility.facility_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm">
                  {facilityCode || "로그인한 담당자의 소속 시설"}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {requiresFacilitySelection
                  ? facilities.length > 0 ? "관리 범위 내 산하시설을 선택해 주세요." : "조회 가능한 산하시설 목록이 없습니다."
                  : "소속 기관은 로그인한 담당자 정보로 자동 지정됩니다."}
              </p>
            </div>
            <div className="space-y-3 sm:col-span-2">
              <Label>주요 질환 (중복 선택 가능)</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {CONDITION_OPTIONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={conditionFlags.includes(option.value)}
                      onChange={(event) => setConditionFlags((current) =>
                        event.target.checked
                          ? [...current, option.value]
                          : current.filter((value) => value !== option.value)
                      )}
                      className="h-4 w-4 accent-foreground"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <Textarea name="conditionsNote" placeholder="기타 질환이나 참고사항을 입력해 주세요." rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-height">키(cm) <span className="text-destructive">*</span></Label>
              <Input id="resident-height" name="heightCm" type="number" min={50} max={250} step="0.1" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-weight">체중(kg) <span className="text-destructive">*</span></Label>
              <Input id="resident-weight" name="weightKg" type="number" min={10} max={300} step="0.1" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-activity">평소 활동량 <span className="text-destructive">*</span></Label>
              <Select value={activityLevel} onValueChange={(value) => setActivityLevel((value as ActivityLevel) ?? "sedentary")}>
                <SelectTrigger id="resident-activity" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVEL_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-meals-per-day">하루 식사 횟수</Label>
              <Select value={String(mealsPerDay)} onValueChange={(value) => setMealsPerDay(Number(value ?? 3) as 1 | 2 | 3 | 4)}>
                <SelectTrigger id="resident-meals-per-day" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((count) => <SelectItem key={count} value={String(count)}>{count}회</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-chewing">씹기 어려움</Label>
              <Select value={chewingDifficulty ? "yes" : "no"} onValueChange={(value) => setChewingDifficulty(value === "yes")}>
                <SelectTrigger id="resident-chewing" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">없음</SelectItem>
                  <SelectItem value="yes">있음</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-mobility">거동 상태</Label>
              <Select value={mobilityLevel} onValueChange={(value) => setMobilityLevel((value ?? "independent") as typeof mobilityLevel)}>
                <SelectTrigger id="resident-mobility" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">독립 보행</SelectItem>
                  <SelectItem value="needs_assistance">보행 도움 필요</SelectItem>
                  <SelectItem value="bedridden">와상</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-allergies">알레르기 및 금기 (선택)</Label>
              <Textarea
                id="resident-allergies"
                name="allergies"
                placeholder="쉼표 또는 줄바꿈으로 구분해 주세요. 예: 우유, 견과류"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-dislikes">기피 식재료 (선택)</Label>
              <Textarea id="resident-dislikes" name="dislikedIngredients" placeholder="쉼표 또는 줄바꿈으로 구분해 주세요. 예: 가지, 피망" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-restrictions">식이 제한 (선택)</Label>
              <Textarea id="resident-restrictions" name="restrictions" placeholder="쉼표 또는 줄바꿈으로 구분해 주세요. 예: 매운 음식, 딱딱한 음식" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-medications">복약 정보 (선택)</Label>
              <Textarea
                id="resident-medications"
                name="medications"
                placeholder={"약 이름 / 복용법 형식으로 한 줄에 하나씩 입력해 주세요.\n예: 암로디핀 5mg / 1일 1회 아침"}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardian-name">보호자 이름·관계 (선택)</Label>
              <Input
                id="guardian-name"
                name="guardianName"
                placeholder="예: 홍길동 (자녀)"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="guardian-phone">보호자 연락처 (선택)</Label>
              <Input
                id="guardian-phone"
                name="guardianPhone"
                type="tel"
                placeholder="010-0000-0000"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-note">메모 (선택)</Label>
              <Input
                id="resident-note"
                name="note"
                placeholder="식이 제한, 방문 시 참고사항 등"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" disabled={submitting || (requiresFacilitySelection && !selectedFacilityId)}>
              <Plus /> {submitting ? "등록 중..." : "대상자 등록"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted px-4 py-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={
          tone === "danger"
            ? "text-xl font-extrabold text-destructive"
            : "text-xl font-extrabold text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

function SortableHead({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <TableHead>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${active ? "text-foreground" : "opacity-40"} ${
            active && !asc ? "rotate-180" : ""
          }`}
        />
      </button>
    </TableHead>
  );
}
