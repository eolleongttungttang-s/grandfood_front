"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Download, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  Resident,
  RESIDENTS_STORAGE_KEY,
  RiskLevel,
} from "@/lib/admin-residents";
import { readAdminSession } from "@/lib/admin-auth";
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = window.localStorage.getItem(RESIDENTS_STORAGE_KEY);
      if (!saved) return;

      try {
        const localResidents = (JSON.parse(saved) as Resident[]).map((resident) => ({
          ...resident,
          isPrototype: true,
        }));
        setResidents([...data, ...localResidents]);
      } catch {
        window.localStorage.removeItem(RESIDENTS_STORAGE_KEY);
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
      if (sortKey === "no") diff = a.id.localeCompare(b.id);
      if (sortKey === "age") diff = a.age - b.age;
      if (sortKey === "risk") diff = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [residents, riskFilter, search, sortKey, sortAsc]);

  function registerResident(resident: Resident) {
    const localResidents = residents.filter(
      (item) => item.isPrototype || item.id.startsWith("LOCAL-"),
    );
    const nextLocalResidents = [...localResidents, resident];
    window.localStorage.setItem(
      RESIDENTS_STORAGE_KEY,
      JSON.stringify(nextLocalResidents),
    );
    setResidents([...data, ...nextLocalResidents]);
    setRegisterOpen(false);
    setPage(1);
    toast.success(`${resident.name} 대상자를 등록했습니다.`);
  }

  const nextResidentId = String(
    residents.reduce((largest, resident) => {
      const id = /^\d+$/.test(resident.id) ? Number(resident.id) : 0;
      return Math.max(largest, id);
    }, 0) + 1,
  ).padStart(3, "0");

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
      r.id,
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
            <Button variant="outline" size="sm" onClick={() => setRegisterOpen(true)}>
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
                <TableCell className="text-muted-foreground">{r.id}</TableCell>
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
        nextResidentId={nextResidentId}
        onClose={() => setRegisterOpen(false)}
        onRegister={registerResident}
      />
    </div>
  );
}

function RegisterResidentDialog({
  open,
  nextResidentId,
  onClose,
  onRegister,
}: {
  open: boolean;
  nextResidentId: string;
  onClose: () => void;
  onRegister: (resident: Resident) => void;
}) {
  const [gender, setGender] = useState<Resident["gender"]>("여");

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = readAdminSession();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const age = Number(form.get("age"));
    const address = String(form.get("address") ?? "").trim();
    const facilityCode = String(form.get("facilityCode") ?? "").trim();
    const condition = String(form.get("condition") ?? "").trim();
    const allergies = String(form.get("allergies") ?? "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
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

    if (!name || !age || !address || !facilityCode) return;

    onRegister({
      id: nextResidentId,
      isPrototype: true,
      name,
      caseWorker: session?.name ?? session?.account ?? "-",
      age,
      gender,
      facilityCode,
      address,
      dong: address,
      condition: condition || "특이사항 없음",
      allergies,
      medications,
      lastResponse: "등록 후 응답 없음",
      lastResponseTone: "neutral",
      risk: "보통",
      guardianName: guardianName || "미등록",
      guardianPhone: guardianPhone || "미등록",
      note: note || "등록된 메모가 없습니다.",
    });
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
              <Label htmlFor="resident-age">
                나이 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resident-age"
                name="age"
                type="number"
                min={1}
                max={120}
                placeholder="예: 78"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resident-gender">
                성별 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={gender}
                onValueChange={(value) => setGender((value as Resident["gender"]) ?? "여")}
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
              <Label htmlFor="resident-facility-code">
                기관코드 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resident-facility-code"
                name="facilityCode"
                placeholder="예: GS-0001"
                required
              />
              <p className="text-xs text-muted-foreground">
                대상자를 관리하는 지자체의 기관코드를 입력해 주세요.
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="resident-condition">주요 질환 (선택)</Label>
              <Textarea
                id="resident-condition"
                name="condition"
                placeholder="예: 고혈압, 당뇨"
              />
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
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">
              <Plus /> 대상자 등록
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
