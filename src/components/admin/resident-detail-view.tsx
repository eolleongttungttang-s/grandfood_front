"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Resident } from "@/lib/admin-residents";
import { ResidentDetail } from "@/lib/admin-resident-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealImageUpload } from "@/components/admin/meal-image-upload";
import { ResidentMonthlyRecommendation } from "@/components/admin/resident-monthly-recommendation";
import { updateAdminRecommendationProfile } from "@/lib/admin-recommendation-profile";
import { ACTIVITY_LEVEL_OPTIONS, type ActivityLevel } from "@/lib/admin-ward-registration";

const RESIDENT_DETAIL_OVERRIDES_KEY = "grandfood_resident_detail_overrides";

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
  detail: initialDetail,
}: {
  resident: Resident;
  detail: ResidentDetail;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [editOpen, setEditOpen] = useState(false);
  const [healthEditOpen, setHealthEditOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(RESIDENT_DETAIL_OVERRIDES_KEY);
        const overrides = saved
          ? (JSON.parse(saved) as Record<string, ResidentDetail>)
          : {};
        if (overrides[resident.id]) setDetail(overrides[resident.id]);
      } catch {
        window.localStorage.removeItem(RESIDENT_DETAIL_OVERRIDES_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resident.id]);

  function saveMedicalInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const diagnoses = String(form.get("diagnoses") ?? "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const allergies = String(form.get("allergies") ?? "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const medications = String(form.get("medications") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [name, ...scheduleParts] = item.split("/");
        return {
          name: name.trim(),
          schedule: scheduleParts.join("/").trim() || "-",
        };
      });
    const otherNote = String(form.get("otherNote") ?? "").trim();
    const nextDetail = {
      ...detail,
      diagnoses,
      allergies,
      medications,
      otherNote: otherNote || "-",
    };

    try {
      const saved = window.localStorage.getItem(RESIDENT_DETAIL_OVERRIDES_KEY);
      const overrides = saved
        ? (JSON.parse(saved) as Record<string, ResidentDetail>)
        : {};
      window.localStorage.setItem(
        RESIDENT_DETAIL_OVERRIDES_KEY,
        JSON.stringify({ ...overrides, [resident.id]: nextDetail }),
      );
    } catch {
      toast.error("수정 내용을 저장하지 못했습니다.");
      return;
    }

    setDetail(nextDetail);
    setEditOpen(false);
    toast.success("질환·알레르기·복약 정보를 수정했습니다.");
  }

  function saveHealthInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const heightCm = Number(form.get("heightCm"));
    const weightKg = Number(form.get("weightKg"));
    const checkupDate = String(form.get("checkupDate") ?? "");
    const activityLevel = String(form.get("activityLevel") ?? "sedentary") as ActivityLevel;
    const mealsPerDay = Number(form.get("mealsPerDay")) as 1 | 2 | 3 | 4;
    const chewingDifficulty = form.get("chewingDifficulty") === "yes";
    const mobilityLevel = String(form.get("mobilityLevel") ?? "independent") as
      | "independent"
      | "needs_assistance"
      | "bedridden";
    if (!heightCm || !weightKg) {
      toast.error("키와 체중을 모두 입력해 주세요.");
      return;
    }

    const nextDetail = {
      ...detail,
      mealsPerDay,
      chewingDifficulty,
      mobilityLevel: mobilityLevel === "independent"
        ? "독립 보행"
        : mobilityLevel === "needs_assistance"
          ? "보행 도움 필요"
          : "와상",
      checkup: {
        ...detail.checkup,
        date: checkupDate || "-",
        heightCm,
        weightKg,
        activityLevel: ACTIVITY_LEVEL_OPTIONS.find(
          (option) => option.value === activityLevel,
        )?.label ?? activityLevel,
      },
    };
    try {
      const saved = window.localStorage.getItem(RESIDENT_DETAIL_OVERRIDES_KEY);
      const overrides = saved
        ? (JSON.parse(saved) as Record<string, ResidentDetail>)
        : {};
      window.localStorage.setItem(
        RESIDENT_DETAIL_OVERRIDES_KEY,
        JSON.stringify({ ...overrides, [resident.id]: nextDetail }),
      );
      updateAdminRecommendationProfile(resident.id, {
        checkupDate: checkupDate || new Date().toISOString().slice(0, 10),
        heightCm,
        weightKg,
        activityLevel,
        mealsPerDay,
        chewingDifficulty,
        mobilityLevel,
      });
    } catch {
      toast.error("수정 내용을 저장하지 못했습니다.");
      return;
    }

    setDetail(nextDetail);
    setHealthEditOpen(false);
    toast.success("추천 건강 프로필을 수정했습니다.");
  }

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
            {resident.name} ({resident.displayId ?? resident.id})
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
              {resident.age}세 · {resident.gender} · {resident.address ?? resident.dong} · 담당{" "}
              {resident.caseWorker ?? detail.caseWorker}
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

      <MealImageUpload
        residentId={resident.id}
        residentName={resident.name}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">추천 건강 프로필</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setHealthEditOpen(true)}>
              <Pencil /> 수정
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">
            반찬 추천에 사용하는 기본 건강정보입니다.
          </span>
          <DetailRow label="건강정보 등록일">{detail.checkup.date}</DetailRow>
          <DetailRow label="성별">{resident.gender}</DetailRow>
          <DetailRow label="키">{detail.checkup.heightCm ?? "-"} cm</DetailRow>
          <DetailRow label="체중">{detail.checkup.weightKg} kg</DetailRow>
          <DetailRow label="평소 활동량">{detail.checkup.activityLevel}</DetailRow>
          <DetailRow label="하루 식사 횟수">
            {detail.mealsPerDay === "-" ? "-" : `${detail.mealsPerDay}회`}
          </DetailRow>
          <DetailRow label="씹기 어려움">
            {detail.chewingDifficulty === null ? "-" : detail.chewingDifficulty ? "있음" : "없음"}
          </DetailRow>
          <DetailRow label="거동 상태">{detail.mobilityLevel}</DetailRow>
          <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
            혈압·혈당 원시 수치는 현재 추천 프로필 API에 포함되지 않아 표시하지 않습니다.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-foreground">질환 · 알레르기 · 복약</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> 수정
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">진단 질환</span>
            <div className="flex flex-wrap gap-1.5">
              {detail.diagnoses.length === 0 ? (
                <span className="text-sm text-muted-foreground">없음</span>
              ) : (
                detail.diagnoses.map((d) => (
                  <Badge key={d} variant="secondary">
                    {d}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">알레르기 · 금기</span>
            <div className="flex flex-wrap gap-1.5">
              {detail.allergies.length === 0 || detail.allergies[0] === "없음" ? (
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
              {detail.medications.length === 0 ? (
                <span className="text-sm text-muted-foreground">없음</span>
              ) : (
                detail.medications.map((m, index) => (
                  <div key={`${m.name}-${index}`} className="flex justify-between gap-4 text-sm">
                    <span className="text-foreground">{m.name}</span>
                    <span className="text-right text-muted-foreground">{m.schedule}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">기피 식재료</span>
              <span className="text-sm text-foreground">
                {detail.dislikedIngredients.length > 0 ? detail.dislikedIngredients.join(", ") : "없음"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">식이 제한</span>
              <span className="text-sm text-foreground">
                {detail.restrictions.length > 0 ? detail.restrictions.join(", ") : "없음"}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">기타</span>
            <p className="text-sm text-foreground">{detail.otherNote ?? "-"}</p>
          </div>
        </div>

        <ResidentMonthlyRecommendation resident={resident} detail={detail} />
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

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="medical-info-edit-title"
            className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-card shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 id="medical-info-edit-title" className="text-xl font-bold">
                  질환·알레르기·복약 수정
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {resident.name}님의 건강 관련 정보를 수정합니다.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditOpen(false)}>
                <X />
                <span className="sr-only">닫기</span>
              </Button>
            </header>
            <form onSubmit={saveMedicalInfo} className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="edit-diagnoses">진단 질환</Label>
                <Textarea
                  id="edit-diagnoses"
                  name="diagnoses"
                  defaultValue={detail.diagnoses.join(", ")}
                  placeholder="쉼표 또는 줄바꿈으로 구분해 주세요."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-allergies">알레르기 및 금기</Label>
                <Textarea
                  id="edit-allergies"
                  name="allergies"
                  defaultValue={detail.allergies.join(", ")}
                  placeholder="예: 우유, 견과류"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-medications">복약 정보</Label>
                <Textarea
                  id="edit-medications"
                  name="medications"
                  defaultValue={detail.medications
                    .map((medication) => `${medication.name} / ${medication.schedule}`)
                    .join("\n")}
                  placeholder={"약 이름 / 복용법 형식으로 한 줄에 하나씩 입력해 주세요.\n예: 암로디핀 5mg / 1일 1회 아침"}
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-other-note">기타</Label>
                <Textarea
                  id="edit-other-note"
                  name="otherNote"
                  defaultValue={detail.otherNote ?? ""}
                  placeholder="추가로 확인할 사항을 입력해 주세요."
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  취소
                </Button>
                <Button type="submit">저장</Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {healthEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="health-info-edit-title"
            className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-card shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <h2 id="health-info-edit-title" className="text-xl font-bold">추천 건강 프로필 수정</h2>
                <p className="mt-1 text-sm text-muted-foreground">{resident.name}님의 반찬 추천 기준 정보를 수정합니다.</p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setHealthEditOpen(false)}>
                <X />
                <span className="sr-only">닫기</span>
              </Button>
            </header>
            <form onSubmit={saveHealthInfo} className="space-y-5 px-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="edit-checkup-date">건강정보 등록일</Label>
                <Input
                  id="edit-checkup-date"
                  name="checkupDate"
                  type="date"
                  defaultValue={detail.checkup.date === "-" ? "" : detail.checkup.date.replaceAll(".", "-")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-height">키 (cm)</Label>
                  <Input
                    id="edit-height"
                    name="heightCm"
                    type="number"
                    min={50}
                    max={250}
                    step="0.1"
                    defaultValue={detail.checkup.heightCm === "-" ? "" : detail.checkup.heightCm}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">체중 (kg)</Label>
                  <Input
                    id="edit-weight"
                    name="weightKg"
                    type="number"
                    min={10}
                    max={300}
                    step="0.1"
                    defaultValue={detail.checkup.weightKg === "-" ? "" : detail.checkup.weightKg}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-activity-level">평소 활동량</Label>
                <select
                  id="edit-activity-level"
                  name="activityLevel"
                  defaultValue={ACTIVITY_LEVEL_OPTIONS.find(
                    (option) => option.label === detail.checkup.activityLevel,
                  )?.value ?? "sedentary"}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {ACTIVITY_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-meals-per-day">하루 식사 횟수</Label>
                  <select
                    id="edit-meals-per-day"
                    name="mealsPerDay"
                    defaultValue={detail.mealsPerDay === "-" ? "3" : String(detail.mealsPerDay)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}회</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-chewing-difficulty">씹기 어려움</Label>
                  <select
                    id="edit-chewing-difficulty"
                    name="chewingDifficulty"
                    defaultValue={detail.chewingDifficulty ? "yes" : "no"}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="no">없음</option>
                    <option value="yes">있음</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-mobility-level">거동 상태</Label>
                <select
                  id="edit-mobility-level"
                  name="mobilityLevel"
                  defaultValue={detail.mobilityLevel === "보행 도움 필요"
                    ? "needs_assistance"
                    : detail.mobilityLevel === "와상"
                      ? "bedridden"
                      : "independent"}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="independent">독립 보행</option>
                  <option value="needs_assistance">보행 도움 필요</option>
                  <option value="bedridden">와상</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 border-t border-border pt-5">
                <Button type="button" variant="outline" onClick={() => setHealthEditOpen(false)}>취소</Button>
                <Button type="submit">저장</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
