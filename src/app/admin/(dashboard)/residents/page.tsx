"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ResidentsTable } from "@/components/admin/residents-table";
import { fetchFacilityWards } from "@/lib/admin-wards-api";
import { Resident, RiskLevel } from "@/lib/admin-residents";

const VALID_RISK: RiskLevel[] = ["고위험", "주의", "보통"];

export default function AdminResidentsPage() {
  const searchParams = useSearchParams();
  const risk = searchParams.get("risk");
  const initialRisk = VALID_RISK.includes(risk as RiskLevel)
    ? (risk as RiskLevel)
    : "all";

  const [residents, setResidents] = useState<Resident[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFacilityWards()
      .then((wards) => {
        if (!cancelled) setResidents(wards);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof Error ? error.message : "대상자 명단을 불러오지 못했습니다.",
        );
        setResidents([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (residents === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        대상자 명단을 불러오는 중...
      </div>
    );
  }

  return <ResidentsTable data={residents} initialRisk={initialRisk} />;
}
