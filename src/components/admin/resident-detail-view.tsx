"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, UserRoundPen, X } from "lucide-react";
import { toast } from "sonner";

import { Resident } from "@/lib/admin-residents";
import { ResidentDetail } from "@/lib/admin-resident-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MealImageUpload } from "@/components/admin/meal-image-upload";
import { ResidentIntakeHistory } from "@/components/admin/resident-intake-history";
import { ResidentMonthlyRecommendation } from "@/components/admin/resident-monthly-recommendation";
import { GrandFoodLogo } from "@/components/brand/grandfood-logo";
import {
  updateFacilityWardHealthProfile,
  updateFacilityWardBasicInfo,
  wardDetailToView,
} from "@/lib/admin-wards-api";
import {
  ACTIVITY_LEVEL_OPTIONS,
  CONDITION_OPTIONS,
  makeFoodRules,
  type ActivityLevel,
} from "@/lib/admin-ward-registration";

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
  const [basicEditOpen, setBasicEditOpen] = useState(false);
  const [residentView, setResidentView] = useState(resident);
  const [saving, setSaving] = useState(false);

  async function saveMedicalInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const conditionFlags = form.getAll("conditionFlags").map(String);
    const allergies = String(form.get("allergies") ?? "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const dislikedIngredients = String(form.get("dislikedIngredients") ?? "")
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const restrictions = String(form.get("restrictions") ?? "")
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
    setSaving(true);
    try {
      const updated = await updateFacilityWardHealthProfile(resident.id, {
        condition_flags: conditionFlags,
        conditions_note: otherNote || null,
        food_rules: makeFoodRules(allergies, dislikedIngredients, restrictions),
        medications_note: medications.map((item) => `${item.name} / ${item.schedule}`).join("\n") || null,
      });
      setDetail(wardDetailToView(updated, resident));
      setEditOpen(false);
      toast.success("질환·알레르기·복약 정보를 수정했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "수정 내용을 저장하지 못했습니다.");
      return;
    } finally {
      setSaving(false);
    }
  }

  async function saveHealthInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const heightCm = Number(form.get("heightCm"));
    const weightKg = Number(form.get("weightKg"));
    const checkupDate = String(form.get("checkupDate") ?? "");
    const activityValue = String(form.get("activityLevel") ?? "");
    const activityLevel = activityValue ? activityValue as ActivityLevel : null;
    const mealsValue = String(form.get("mealsPerDay") ?? "");
    const mealsPerDay = mealsValue ? Number(mealsValue) as 1 | 2 | 3 | 4 : null;
    const chewingValue = String(form.get("chewingDifficulty") ?? "");
    const chewingDifficulty = chewingValue ? chewingValue === "yes" : null;
    const mobilityValue = String(form.get("mobilityLevel") ?? "");
    const mobilityLevel = mobilityValue ? mobilityValue as
      | "independent"
      | "needs_assistance"
      | "bedridden" : null;
    if (!heightCm || !weightKg) {
      toast.error("키와 체중을 모두 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateFacilityWardHealthProfile(resident.id, {
        checkup_date: checkupDate || null,
        height_cm: heightCm,
        weight_kg: weightKg,
        activity_level: activityLevel,
        meals_per_day: mealsPerDay,
        chewing_difficulty: chewingDifficulty,
        mobility_level: mobilityLevel,
      });
      setDetail(wardDetailToView(updated, resident));
      setHealthEditOpen(false);
      toast.success("추천 건강 프로필을 수정했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "수정 내용을 저장하지 못했습니다.");
      return;
    } finally {
      setSaving(false);
    }
  }

  async function saveBasicInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const updated = await updateFacilityWardBasicInfo(resident.id, {
        name: String(form.get("name") ?? "").trim(),
        birth_date: String(form.get("birthDate") ?? ""),
        gender: String(form.get("gender")) === "male" ? "male" : "female",
        phone: String(form.get("phone") ?? "").trim(),
        address: String(form.get("address") ?? "").trim(),
        guardian_name: String(form.get("guardianName") ?? "").trim() || null,
        guardian_phone: String(form.get("guardianPhone") ?? "").trim() || null,
        note: String(form.get("note") ?? "").trim() || null,
      });
      setResidentView((current) => ({
        ...current,
        name: updated.name,
        birthDate: updated.birth_date,
        gender: updated.gender === "male" ? "남" : updated.gender === "female" ? "여" : "미상",
        phone: updated.phone,
        address: updated.address,
        dong: updated.address,
        guardianName: updated.guardian_name ?? "미등록",
        guardianPhone: updated.guardian_phone ?? "미등록",
        note: updated.note ?? "",
        facilityId: updated.care_facility_id ?? undefined,
      }));
      setBasicEditOpen(false);
      toast.success("대상자 기본정보를 수정했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "기본정보를 수정하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

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
            {residentView.name} ({residentView.displayId ?? residentView.id})
          </span>
        </div>
        <span className="text-xs text-sidebar-foreground/60">
          열람 사유: 상세 정보 확인 · 로그 기록됨
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xl font-extrabold text-muted-foreground">
            {residentView.name.slice(0, 1)}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-foreground">
                {residentView.name}
              </span>
              <Badge className={RISK_BADGE_CLASS[resident.risk]}>{resident.risk}</Badge>
              {detail.livingAlone && <Badge variant="outline">독거</Badge>}
            </div>
            <span className="text-sm text-muted-foreground">
              {residentView.age}세 · {residentView.gender} · {residentView.address ?? residentView.dong} · 담당{" "}
              {residentView.caseWorker ?? detail.caseWorker}
            </span>
            <span className="text-sm text-muted-foreground">
              보호자 {residentView.guardianName} {residentView.guardianPhone} · 앱 연동됨
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBasicEditOpen(true)}>
            <UserRoundPen /> 기본정보 수정
          </Button>
        </div>
      </div>

      <nav className="sticky top-3 z-30 overflow-x-auto rounded-xl border border-border bg-card/95 p-2 shadow-sm backdrop-blur" aria-label="대상자 상세 빠른 이동">
        <div className="flex min-w-max gap-1.5">
          {[
            ["meal-analysis", "이미지 분석"],
            ["health-profile", "건강정보"],
            ["meal-recommendation", "식단 추천"],
            ["intake-history", "섭취 기록"],
          ].map(([target, label]) => (
            <a
              key={target}
              href={`#${target}`}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div id="meal-analysis" className="scroll-mt-24">
        <MealImageUpload
          residentId={resident.id}
          residentName={residentView.name}
        />
      </div>

      <div id="health-profile" className="grid scroll-mt-24 gap-4 lg:grid-cols-3">
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

        <div id="meal-recommendation" className="scroll-mt-24 lg:col-span-3">
          <ResidentMonthlyRecommendation resident={residentView} detail={detail} />
        </div>
      </div>

      <div id="intake-history" className="scroll-mt-24">
        <ResidentIntakeHistory residentId={resident.id} residentName={residentView.name} registeredAt={resident.registeredAt} />
      </div>

      <footer className="flex justify-center border-t border-border/60 py-11">
        <GrandFoodLogo
          className="opacity-70"
          markClassName="h-12 w-12"
          wordmarkClassName="text-xl font-extrabold text-muted-foreground"
        />
      </footer>

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
                <Label>진단 질환</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CONDITION_OPTIONS.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        name="conditionFlags"
                        value={option.value}
                        defaultChecked={detail.diagnoses.includes(option.label)}
                        className="h-4 w-4 accent-foreground"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">대상자 등록 화면과 동일한 질환 코드로 저장됩니다.</p>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-disliked-ingredients">기피 식재료</Label>
                  <Textarea id="edit-disliked-ingredients" name="dislikedIngredients" defaultValue={detail.dislikedIngredients.join(", ")} placeholder="예: 가지, 피망" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-restrictions">식이 제한</Label>
                  <Textarea id="edit-restrictions" name="restrictions" defaultValue={detail.restrictions.join(", ")} placeholder="예: 딱딱한 음식" />
                </div>
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
                  )?.value ?? ""}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">미상</option>
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
                    defaultValue={detail.mealsPerDay === "-" ? "" : String(detail.mealsPerDay)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">미상</option>
                    {[1, 2, 3, 4].map((count) => <option key={count} value={count}>{count}회</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-chewing-difficulty">씹기 어려움</Label>
                  <select
                    id="edit-chewing-difficulty"
                    name="chewingDifficulty"
                    defaultValue={detail.chewingDifficulty === null ? "" : detail.chewingDifficulty ? "yes" : "no"}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">미상</option>
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
                  defaultValue={detail.mobilityLevel === "-"
                    ? ""
                    : detail.mobilityLevel === "보행 도움 필요"
                    ? "needs_assistance"
                    : detail.mobilityLevel === "와상"
                      ? "bedridden"
                      : "independent"}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">미상</option>
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
      {basicEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <section role="dialog" aria-modal="true" aria-labelledby="basic-info-edit-title" className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-card shadow-2xl">
            <header className="flex items-start justify-between border-b border-border px-6 py-5">
              <div><h2 id="basic-info-edit-title" className="text-xl font-bold">대상자 기본정보 수정</h2><p className="mt-1 text-sm text-muted-foreground">등록 당시 입력한 기본정보와 보호자 정보를 수정합니다.</p></div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setBasicEditOpen(false)}><X /><span className="sr-only">닫기</span></Button>
            </header>
            <form onSubmit={saveBasicInfo} className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="basic-name">이름</Label><Input id="basic-name" name="name" defaultValue={residentView.name} required /></div>
                <div className="space-y-2"><Label htmlFor="basic-birth-date">생년월일</Label><Input id="basic-birth-date" name="birthDate" type="date" defaultValue={residentView.birthDate ?? ""} required /></div>
                <div className="space-y-2"><Label htmlFor="basic-gender">성별</Label><select id="basic-gender" name="gender" defaultValue={residentView.gender === "남" ? "male" : "female"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="female">여</option><option value="male">남</option></select></div>
                <div className="space-y-2"><Label htmlFor="basic-phone">대상자 연락처</Label><Input id="basic-phone" name="phone" type="tel" defaultValue={residentView.phone ?? ""} required /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="basic-address">주소</Label><Input id="basic-address" name="address" defaultValue={residentView.address ?? residentView.dong} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="basic-guardian-name">보호자 이름</Label><Input id="basic-guardian-name" name="guardianName" defaultValue={residentView.guardianName === "미등록" ? "" : residentView.guardianName} /></div>
                <div className="space-y-2"><Label htmlFor="basic-guardian-phone">보호자 연락처</Label><Input id="basic-guardian-phone" name="guardianPhone" type="tel" defaultValue={residentView.guardianPhone === "미등록" ? "" : residentView.guardianPhone} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="basic-note">일반 참고사항</Label><Textarea id="basic-note" name="note" defaultValue={residentView.note} /></div>
              <div className="flex justify-end gap-3 border-t border-border pt-5"><Button type="button" variant="outline" onClick={() => setBasicEditOpen(false)}>취소</Button><Button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</Button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
