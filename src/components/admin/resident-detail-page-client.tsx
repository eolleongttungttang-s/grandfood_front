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

    function loadLocalResident() {
      try {
        const saved = window.localStorage.getItem(RESIDENTS_STORAGE_KEY);
        const localResidents = saved ? (JSON.parse(saved) as Resident[]) : [];
        return localResidents.find((item) => item.id === residentId) ?? null;
      } catch {
        window.localStorage.removeItem(RESIDENTS_STORAGE_KEY);
        return null;
      }
    }

    async function resolve() {
      try {
        const wards = await fetchFacilityWards();
        const apiResident = wards.find((item) => item.id === residentId);
        if (cancelled) return;
        if (apiResident) {
          setResident(apiResident);
          setDetail(getResidentDetail(apiResident));
          setLoading(false);
          return;
        }
      } catch {
        // API 실패 시에도 아래 localStorage 대상자 조회를 계속한다.
      }

      if (!cancelled) {
        const localResident = loadLocalResident();
        setResident(localResident);
        setDetail(localResident ? getEmptyResidentDetail(localResident) : null);
        setLoading(false);
      }
    }

    void resolve();
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
