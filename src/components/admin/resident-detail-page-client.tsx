"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ResidentDetailView } from "@/components/admin/resident-detail-view";
import { buttonVariants } from "@/components/ui/button";
import { type ResidentDetail } from "@/lib/admin-resident-detail";
import { type Resident } from "@/lib/admin-residents";
import {
  fetchFacilityWardDetail,
  fetchFacilityWards,
  wardDetailToView,
} from "@/lib/admin-wards-api";

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
      try {
        const wards = await fetchFacilityWards();
        const foundResident = wards.find((item) => item.id === residentId);
        if (cancelled) return;
        if (foundResident) {
          const apiResident = {
            ...foundResident,
            caseWorker: foundResident.caseWorker ?? "-",
          };
          setResident(apiResident);
          const wardDetail = await fetchFacilityWardDetail(apiResident.id);
          if (cancelled) return;
          setDetail(wardDetailToView(wardDetail, apiResident));
          setLoading(false);
          return;
        }
      } catch {
        // 목록 API 오류는 상위 화면과 동일하게 대상자를 찾지 못한 상태로 처리한다.
      }

      if (!cancelled) setLoading(false);
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
