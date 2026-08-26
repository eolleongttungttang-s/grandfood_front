"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getJson, userFacingErrorMessage } from "@/lib/api";
import type { WardSummary } from "@/lib/admin-wards-api";
import { getConditionLabel } from "@/lib/admin-ward-registration";

type FacilityResponse = {
  facility_id: string;
  name: string;
  facility_type: string;
  facility_code: string;
  department: string | null;
};

const PAGE_SIZE = 10;

export function DatabaseFacilityResidentsDashboard() {
  const facilityId = useSearchParams().get("id") ?? "";
  const [facility, setFacility] = useState<FacilityResponse | null>(null);
  const [residents, setResidents] = useState<WardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!facilityId) {
        setError("시설 정보가 없습니다.");
        setLoading(false);
        return;
      }
      try {
        const [facilities, wards] = await Promise.all([
          getJson<FacilityResponse[]>("/api/admin/facilities"),
          getJson<WardSummary[]>("/gov/facility/wards"),
        ]);
        const selected = facilities.find((item) => item.facility_id === facilityId) ?? null;
        if (!selected) throw new Error("선택한 시설을 찾지 못했습니다.");
        if (!cancelled) {
          setFacility(selected);
          setResidents(wards.filter((ward) => ward.facility_code === selected.facility_code));
        }
      } catch (loadError) {
        if (!cancelled) setError(userFacingErrorMessage(loadError, "시설 대상자를 불러오지 못했습니다."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [facilityId]);

  const filtered = useMemo(() => {
    const query = search.trim();
    if (!query) return residents;
    return residents.filter((resident) =>
      [resident.name, resident.address, resident.guardian_name ?? "", resident.case_worker_name ?? ""].some((value) => value.includes(query)),
    );
  }, [residents, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleResidents = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/admin/statistics-empty" />}><ArrowLeft /> 통합모니터링2로 돌아가기</Button>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /><h1 className="text-2xl font-extrabold">{facility?.name ?? "시설 관리 어르신"}</h1>{facility && <Badge variant="outline">{facility.facility_code}</Badge>}</div>
            <p className="mt-1 text-sm text-muted-foreground">목데이터가 아닌 백엔드에 등록된 실제 대상자 목록입니다.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3"><UsersRound className="h-5 w-5 text-primary" /><span className="text-sm">관리 어르신</span><strong className="text-xl">{residents.length}명</strong></div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><CardTitle>관리 어르신 명단</CardTitle><p className="mt-1 text-sm text-muted-foreground">선택한 시설코드와 일치하는 등록 대상자입니다.</p></div>
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="이름·주소·담당자 검색" className="w-64 pl-9" /></div>
          </div>
        </CardHeader>
        <CardContent>
          {loading || error || residents.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{loading ? "대상자 정보를 불러오는 중입니다." : error ?? "이 시설에 등록된 어르신이 없습니다."}</p>
          ) : (
            <>
              <Table>
                <TableHeader><TableRow><TableHead>번호</TableHead><TableHead>성명</TableHead><TableHead>나이·성별</TableHead><TableHead>주소</TableHead><TableHead>주요 질환</TableHead><TableHead>보호자</TableHead><TableHead>담당자</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visibleResidents.map((resident, index) => (
                    <TableRow key={resident.id}>
                      <TableCell className="font-mono text-xs">{String((page - 1) * PAGE_SIZE + index + 1).padStart(3, "0")}</TableCell><TableCell className="font-bold">{resident.name}</TableCell><TableCell>{resident.age}세 · {resident.gender === "male" ? "남" : resident.gender === "female" ? "여" : "미상"}</TableCell><TableCell>{resident.address}</TableCell><TableCell>{resident.condition_flags.length ? resident.condition_flags.map(getConditionLabel).join(", ") : "특이사항 없음"}</TableCell><TableCell>{resident.guardian_name ?? "미등록"}</TableCell><TableCell>{resident.case_worker_name ?? "미지정"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>총 {filtered.length}명 · {page}/{totalPages} 페이지</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>이전</Button><Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>다음</Button></div></div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
