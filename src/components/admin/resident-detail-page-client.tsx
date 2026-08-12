"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ResidentDetailView } from "@/components/admin/resident-detail-view";
import { buttonVariants } from "@/components/ui/button";
import {
  getEmptyResidentDetail,
  type ResidentDetail,
} from "@/lib/admin-resident-detail";
import {
  type Resident,
  RESIDENTS_STORAGE_KEY,
} from "@/lib/admin-residents";

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

    const timeoutId = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(RESIDENTS_STORAGE_KEY);
        const localResidents = saved ? (JSON.parse(saved) as Resident[]) : [];
        const localResident = localResidents.find((item) => item.id === residentId) ?? null;
        setResident(localResident);
        setDetail(localResident ? getEmptyResidentDetail(localResident) : null);
      } catch {
        window.localStorage.removeItem(RESIDENTS_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
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
