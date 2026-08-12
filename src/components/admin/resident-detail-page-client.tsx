"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ResidentDetailView } from "@/components/admin/resident-detail-view";
import { buttonVariants } from "@/components/ui/button";
import {
  getEmptyResidentDetail,
  getResidentDetail,
  type ResidentDetail,
} from "@/lib/admin-resident-detail";
import {
  type Resident,
  RESIDENTS_STORAGE_KEY,
} from "@/lib/admin-residents";
import { fetchFacilityWards } from "@/lib/admin-wards-api";

export function ResidentDetailPageClient({
  residentId,
  initialResident,
  initialDetail,
}: {
  residentId: string;
  initialResident: Resident | null;
  initialDetail: ResidentDetail | null;
}) {
  const [resident, setResident] = useState<Resident | null>(initialResident);
  const [detail, setDetail] = useState<ResidentDetail | null>(initialDetail);
  const [loading, setLoading] = useState(initialResident === null);

  useEffect(() => {
    if (initialResident) return;

    let cancelled = false;

    async function resolve() {
      // 1순위: 실제 백엔드 대상자(GET /gov/facility/wards) — 건강검진/복약/식단근거
      // 패널은 아직 뒷받침할 데이터가 없어 getResidentDetail의 seed 기반 표시를 씀.
      try {
        const wards = await fetchFacilityWards();
        const realResident = wards.find((item) => item.id === residentId) ?? null;
        if (realResident) {
          if (!cancelled) {
            setResident(realResident);
            setDetail(getResidentDetail(realResident));
            setLoading(false);
          }
          return;
        }
      } catch {
        // 백엔드 조회 실패는 조용히 넘어가고 로컬(프로토타입 등록) 대상자를 찾아본다.
      }

      // 2순위: "대상자 등록" 다이얼로그로 로컬에만 등록해둔 프로토타입 대상자.
      try {
        const saved = window.localStorage.getItem(RESIDENTS_STORAGE_KEY);
        const localResidents = saved ? (JSON.parse(saved) as Resident[]) : [];
        const localResident = localResidents.find((item) => item.id === residentId) ?? null;
        if (!cancelled) {
          setResident(localResident);
          setDetail(localResident ? getEmptyResidentDetail(localResident) : null);
        }
      } catch {
        window.localStorage.removeItem(RESIDENTS_STORAGE_KEY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [initialResident, residentId]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">대상자 정보를 불러오는 중입니다.</div>;
  }

  if (!resident || !detail) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">등록된 대상자 정보를 찾을 수 없습니다.</p>
        <Link href="/admin/residents" className={buttonVariants({ variant: "outline" })}>
          대상자 명단으로 돌아가기
        </Link>
      </div>
    );
  }

  return <ResidentDetailView resident={resident} detail={detail} />;
}
