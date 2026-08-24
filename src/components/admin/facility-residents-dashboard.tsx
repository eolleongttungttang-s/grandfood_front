"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import type { CareFacility } from "@/lib/statistics-mock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createFacilityResidentMocks } from "@/lib/facility-resident-mock";

const PAGE_SIZE = 10;

export function FacilityResidentsDashboard({ facility }: { facility: CareFacility }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const residents = useMemo(() => createFacilityResidentMocks(facility), [facility]);
  const filtered = useMemo(() => {
    const query = search.trim();
    if (!query) return residents;
    return residents.filter((resident) =>
      [resident.id, resident.name, resident.address, resident.healthStatus].some((value) => value.includes(query)),
    );
  }, [residents, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleResidents = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/admin/statistics" />}>
          <ArrowLeft /> 통합모니터링으로 돌아가기
        </Button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><h1 className="text-2xl font-extrabold">{facility.name}</h1><Badge variant="outline">{facility.type}</Badge></div>
            <p className="mt-1 text-sm text-muted-foreground">{facility.region} {facility.municipality} · 기관코드 {facility.municipalityCode}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3"><UsersRound className="h-5 w-5 text-primary" /><span className="text-sm">관리 어르신</span><strong className="text-xl">{residents.length}명</strong></div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        {[["전체 어르신", `${residents.length}명`], ["식사 기록률", `${facility.mealRecordRate}%`], ["평균 섭취율", `${facility.averageIntakeRate}%`], ["집중 관리", `${facility.unresolvedAlerts}명`]].map(([label, value]) => (
          <Card key={label}><CardContent className="py-1"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></CardContent></Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><CardTitle>관리 어르신 명단</CardTitle><p className="mt-1 text-sm text-muted-foreground">운영 현황의 {facility.residents}명과 동일한 목데이터입니다.</p></div>
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="이름·주소·상태 검색" className="w-64 pl-9" /></div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>대상번호</TableHead><TableHead>성명</TableHead><TableHead>나이·성별</TableHead><TableHead>주소</TableHead><TableHead className="text-right">기록률</TableHead><TableHead className="text-right">섭취율</TableHead><TableHead>최근 식사</TableHead><TableHead>관리 상태</TableHead></TableRow></TableHeader>
            <TableBody>
              {visibleResidents.map((resident) => (
                <TableRow key={resident.id}>
                  <TableCell className="font-mono text-xs">{resident.id}</TableCell><TableCell className="font-bold">{resident.name}</TableCell><TableCell>{resident.age}세 · {resident.gender}</TableCell><TableCell>{resident.address}</TableCell><TableCell className="text-right font-semibold">{resident.mealRecordRate}%</TableCell><TableCell className="text-right font-semibold">{resident.averageIntakeRate}%</TableCell><TableCell>{resident.lastMeal}</TableCell>
                  <TableCell><Badge variant={resident.healthStatus === "집중 관리" ? "destructive" : "secondary"} className={resident.healthStatus === "관찰 필요" ? "bg-amber-100 text-amber-800" : undefined}>{resident.healthStatus}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>총 {filtered.length}명 · {page}/{totalPages} 페이지</span>
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>이전</Button><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>다음</Button></div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
