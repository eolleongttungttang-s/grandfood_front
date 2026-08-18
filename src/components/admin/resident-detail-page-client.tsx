"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ResidentDetailView } from "@/components/admin/resident-detail-view";
import { buttonVariants } from "@/components/ui/button";
import {
  getEmptyResidentDetail,
  type ResidentDetail,
} from "@/lib/admin-resident-detail";
import { type Resident } from "@/lib/admin-residents";
import { fetchFacilityWards } from "@/lib/admin-wards-api";
import { readAdminRecommendationProfile } from "@/lib/admin-recommendation-profile";
import { ACTIVITY_LEVEL_OPTIONS, getConditionLabel } from "@/lib/admin-ward-registration";

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
          // 상세 API가 준비되기 전까지 등록 화면에서 받은 추천 프로필을 UUID로 연결한다.
          // 저장값이 없으면 임의 수치를 만들지 않고 빈 상세 화면을 사용한다.
          const savedProfile = readAdminRecommendationProfile(apiResident.id);
          const emptyDetail = getEmptyResidentDetail(apiResident);
          setDetail(savedProfile ? {
            ...emptyDetail,
            diagnoses: savedProfile.conditionFlags.map(getConditionLabel),
            allergies: savedProfile.allergies,
            medications: savedProfile.medications,
            otherNote: savedProfile.conditionsNote || emptyDetail.otherNote,
            dislikedIngredients: savedProfile.dislikedIngredients,
            restrictions: savedProfile.restrictions,
            mealsPerDay: savedProfile.mealsPerDay,
            chewingDifficulty: savedProfile.chewingDifficulty,
            mobilityLevel: savedProfile.mobilityLevel === "independent"
              ? "독립 보행"
              : savedProfile.mobilityLevel === "needs_assistance"
                ? "보행 도움 필요"
                : "와상",
            checkup: {
              ...emptyDetail.checkup,
              date: savedProfile.checkupDate,
              heightCm: savedProfile.heightCm,
              weightKg: savedProfile.weightKg,
              activityLevel: ACTIVITY_LEVEL_OPTIONS.find(
                (option) => option.value === savedProfile.activityLevel,
              )?.label ?? savedProfile.activityLevel,
            },
          } : emptyDetail);
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
