"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { Resident } from "@/lib/admin-residents";
import { ResidentDetail } from "@/lib/admin-resident-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealImageUpload } from "@/components/admin/meal-image-upload";

const MEAL_TONE_CLASS: Record<string, string> = {
  완식: "bg-foreground",
  소량: "bg-risk-caution-foreground",
  미응답: "bg-risk-high-foreground",
};

const RISK_BADGE_CLASS: Record<Resident["risk"], string> = {
  고위험: "bg-risk-high text-risk-high-foreground",
  주의: "bg-risk-caution text-risk-caution-foreground",
  보통: "bg-risk-normal text-risk-normal-foreground",
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{children}</span>
    </div>
  );
}

export function ResidentDetailView({
  resident,
  detail,
}: {
  resident: Resident;
  detail: ResidentDetail;
}) {
  const completeCount = detail.mealHistory.filter((m) => m === "완식").length;
  const smallCount = detail.mealHistory.filter((m) => m === "소량").length;
  const noResponseCount = detail.mealHistory.filter((m) => m === "미응답").length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between rounded-xl bg-sidebar px-5 py-3 text-sidebar-foreground shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/admin/residents"
            className="flex items-center gap-1 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            대상자 명단
          </Link>
          <span className="text-sidebar-foreground/40">/</span>
          <span className="font-semibold">
            {resident.name} ({resident.id})
          </span>
        </div>
        <span className="text-xs text-sidebar-foreground/60">
          열람 사유: 상세 정보 확인 · 로그 기록됨
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-extrabold text-muted-foreground">
            {resident.name.slice(0, 1)}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                {resident.name}
              </span>
              <Badge className={RISK_BADGE_CLASS[resident.risk]}>{resident.risk}</Badge>
              {detail.livingAlone && <Badge variant="outline">독거</Badge>}
            </div>
            <span className="text-sm text-muted-foreground">
              {resident.age}세 · {resident.gender} · {resident.address ?? resident.dong} · 수급 구분{" "}
              {detail.supportType} · 담당 {detail.caseWorker}
            </span>
            <span className="text-sm text-muted-foreground">
              보호자 {resident.guardianName} {resident.guardianPhone} · 앱 연동됨
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success(`${resident.name}님 방문을 요청했어요.`)}
          >
            방문 요청
          </Button>
          <Button
            size="sm"
            onClick={() => toast.success(`${resident.name}님 긴급 확인이 배정됐어요.`)}
          >
            긴급 확인 배정
          </Button>
        </div>
      </div>

      <MealImageUpload residentId={resident.id} residentName={resident.name} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-foreground">건강검진 데이터</h2>
            <span className="text-xs text-muted-foreground">
              {detail.checkup.date} 국가검진 연계
            </span>
          </div>
          <DetailRow label="수축기 혈압">{detail.checkup.systolicBP} mmHg</DetailRow>
          <DetailRow label="공복혈당">{detail.checkup.fastingGlucose} mg/dL</DetailRow>
          <DetailRow label="당화혈색소">{detail.checkup.hba1c} %</DetailRow>
          <DetailRow label="eGFR (신기능)">{detail.checkup.egfr}</DetailRow>
          <DetailRow label="체중">{detail.checkup.weightKg} kg</DetailRow>
          <DetailRow label="알부민">{detail.checkup.albumin} g/dL</DetailRow>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">질환 · 알레르기 · 복약</h2>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">진단 질환</span>
            <div className="flex flex-wrap gap-1.5">
              {detail.diagnoses.map((d) => (
                <Badge key={d} variant="secondary">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">알레르기 · 금기</span>
            <div className="flex flex-wrap gap-1.5">
              {detail.allergies[0] === "없음" ? (
                <span className="text-sm text-muted-foreground">없음</span>
              ) : (
                detail.allergies.map((a) => (
                  <Badge key={a} className="bg-risk-high text-risk-high-foreground">
                    {a}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">복약</span>
            <div className="flex flex-col gap-1">
              {detail.medications.map((m) => (
                <div key={m.name} className="flex justify-between text-sm">
                  <span className="text-foreground">{m.name}</span>
                  <span className="text-muted-foreground">{m.schedule}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">저작 · 연하 상태</span>
            <p className="text-sm text-foreground">{detail.chewingNote}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-foreground">현재 식단과 근거</h2>
            <span className="text-xs text-muted-foreground">주 5회 · 점심</span>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-sidebar p-4 text-sidebar-foreground">
            <span className="text-xs font-bold tracking-wide text-sidebar-primary">
              배정 식단
            </span>
            <span className="text-lg font-extrabold">{detail.diet.name}</span>
            <div className="flex gap-4 pt-1 text-xs">
              <div className="flex flex-col">
                <span className="text-sidebar-foreground/60">나트륨</span>
                <span className="font-semibold">{detail.diet.sodiumMg}mg</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sidebar-foreground/60">단백질</span>
                <span className="font-semibold">{detail.diet.proteinG}g</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sidebar-foreground/60">열량</span>
                <span className="font-semibold">{detail.diet.kcal}kcal</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground">왜 이 식단인가</span>
            {detail.diet.reasons.map((reason, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-lg border border-border bg-muted/50 p-2.5 text-sm text-foreground"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                  {i + 1}
                </span>
                {reason}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-foreground">최근 14일 섭취 기록</h2>
          <span className="text-xs text-muted-foreground">
            완식 <span className="font-semibold text-foreground">{completeCount}</span> · 소량{" "}
            <span className="font-semibold text-risk-caution-foreground">{smallCount}</span> ·
            미응답{" "}
            <span className="font-semibold text-risk-high-foreground">{noResponseCount}</span>
          </span>
        </div>
        <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
          {detail.mealHistory.map((tone, i) => (
            <div
              key={i}
              className={`h-10 rounded-sm ${MEAL_TONE_CLASS[tone]}`}
              title={tone}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
