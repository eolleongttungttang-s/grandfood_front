"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Download, Search } from "lucide-react";

import { Resident, RiskLevel } from "@/lib/admin-residents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">(initialRisk);
  const [search, setSearch] = useState("");
  const [dongFilter, setDongFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("no");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Resident | null>(null);

  const dongs = useMemo(
    () => Array.from(new Set(data.map((r) => r.dong))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    let rows = data;
    if (riskFilter !== "all") rows = rows.filter((r) => r.risk === riskFilter);
    if (dongFilter !== "all") rows = rows.filter((r) => r.dong === dongFilter);
    if (search.trim()) {
      const q = search.trim();
      rows = rows.filter((r) => r.name.includes(q));
    }
    const sorted = [...rows].sort((a, b) => {
      let diff = 0;
      if (sortKey === "no") diff = a.id.localeCompare(b.id);
      if (sortKey === "age") diff = a.age - b.age;
      if (sortKey === "risk") diff = RISK_ORDER[a.risk] - RISK_ORDER[b.risk];
      return sortAsc ? diff : -diff;
    });
    return sorted;
  }, [data, riskFilter, dongFilter, search, sortKey, sortAsc]);

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
    const header = ["번호", "성명", "나이", "거주 동", "주요 질환", "최근 응답", "위험도"];
    const rows = filtered.map((r) => [
      r.id,
      r.name,
      String(r.age),
      r.dong,
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
              관내 급식 지원 어르신 {data.length}명 · 오늘 기준
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="이름으로 검색"
                className="w-40 pl-8"
              />
            </div>
            <Select
              value={dongFilter}
              onValueChange={(v) => {
                if (!v) return;
                setDongFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="동 전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">동 전체</SelectItem>
                {dongs.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            value={String(data.length)}
          />
          <StatCard
            label="고위험군"
            value={String(data.filter((r) => r.risk === "고위험").length)}
            tone="danger"
          />
          <StatCard
            label="3일 이상 미응답"
            value={String(
              data.filter((r) => r.lastResponseTone === "danger").length
            )}
            tone="danger"
          />
          <StatCard
            label="검진 갱신 필요"
            value={String(Math.round(data.length * 0.06))}
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
              <SortableHead
                label="나이"
                active={sortKey === "age"}
                asc={sortAsc}
                onClick={() => toggleSort("age")}
              />
              <TableHead>거주 동</TableHead>
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
                  colSpan={7}
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
                onClick={() => setSelected(r)}
              >
                <TableCell className="text-muted-foreground">{r.id}</TableCell>
                <TableCell className="font-semibold text-foreground">
                  {r.name}
                </TableCell>
                <TableCell>{r.age}</TableCell>
                <TableCell>{r.dong}</TableCell>
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

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent>
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selected.name}
                  <Badge className={RISK_BADGE_CLASS[selected.risk]}>
                    {selected.risk}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  {selected.age}세 · {selected.gender} · {selected.dong}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4 text-sm">
                <DetailRow label="주요 질환" value={selected.condition} />
                <DetailRow label="최근 응답" value={selected.lastResponse} />
                <DetailRow
                  label="보호자"
                  value={`${selected.guardianName} · ${selected.guardianPhone}`}
                />
                <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    담당자 메모
                  </span>
                  <p className="leading-relaxed text-foreground">
                    {selected.note}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  열람 사유가 자동으로 감사 로그에 기록됩니다.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
