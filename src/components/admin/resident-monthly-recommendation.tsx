"use client";

import { useEffect, useMemo, useState } from "react";
import { Beef, ChevronLeft, ChevronRight, Droplet, Flame, LoaderCircle, Sparkles, Wheat } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchMonthlyRecommendation,
  generateMonthlyRecommendation,
  type FacilityMealType,
  type MonthlyRecommendation,
} from "@/lib/admin-monthly-recommendation-api";
import type { ResidentDetail } from "@/lib/admin-resident-detail";
import type { Resident } from "@/lib/admin-residents";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MEAL_TYPES = [
  { value: "breakfast", label: "아침" },
  { value: "lunch", label: "점심" },
  { value: "dinner", label: "저녁" },
] as const;

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(month: Date, day: number) {
  return `${getMonthKey(month)}-${String(day).padStart(2, "0")}`;
}

function isDateInWeek(date: string, weekStart: string) {
  const target = Date.parse(`${date}T00:00:00Z`);
  const start = Date.parse(`${weekStart}T00:00:00Z`);
  return target >= start && target < start + 7 * 86_400_000;
}

export function ResidentMonthlyRecommendation({ resident, detail }: { resident: Resident; detail: ResidentDetail }) {
  const [month, setMonth] = useState(() => new Date());
  const [monthly, setMonthly] = useState<MonthlyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<FacilityMealType>("breakfast");
  const monthKey = getMonthKey(month);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: first }, () => null), ...Array.from({ length: last }, (_, index) => index + 1)];
  }, [month]);
  const isGenerating = monthly?.weeks.some((week) => week.generation_status === "generating") ?? false;
  const hasRecommendations = monthly?.days?.some((day) => day.meals.some((meal) => meal.items.length > 0)) ?? false;
  const selectedDay = monthly?.days?.find((day) => day.service_date === selectedDate) ?? null;
  const selectedItems = selectedDay?.meals.find((meal) => meal.meal_type === selectedMeal)?.items ?? [];
  const selectedTargets = selectedDate
    ? monthly?.weeks.find((week) => isDateInWeek(selectedDate, week.week_start_date))?.recommendation
    : null;

  useEffect(() => {
    let cancelled = false;
    fetchMonthlyRecommendation(resident.id, monthKey)
      .then((result) => { if (!cancelled) setMonthly(result); })
      .catch((error) => {
        if (!cancelled) {
          setMonthly(null);
          toast.error(error instanceof Error ? error.message : "월간 추천을 불러오지 못했습니다.");
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [monthKey, resident.id]);

  useEffect(() => {
    if (!isGenerating) return;
    const intervalId = window.setInterval(() => {
      void fetchMonthlyRecommendation(resident.id, monthKey).then(setMonthly).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [isGenerating, monthKey, resident.id]);

  function moveMonth(offset: number) {
    setLoading(true);
    setMonthly(null);
    setSelectedDate(null);
    setSelectedMeal("breakfast");
    setMonth((value) => new Date(value.getFullYear(), value.getMonth() + offset, 1));
  }

  async function generate() {
    setRequesting(true);
    try {
      setMonthly(await generateMonthlyRecommendation(resident.id, monthKey, hasRecommendations));
      toast.success(`${resident.name}님의 ${monthKey} 월간 추천 생성을 요청했습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "월간 추천을 생성하지 못했습니다.");
    } finally {
      setRequesting(false);
    }
  }

  const total = selectedItems.reduce((sum, item) => ({
    sodium: sum.sodium + (item.sodium_per_100g ?? 0),
    protein: sum.protein + (item.protein_per_100g ?? 0),
    kcal: sum.kcal + (item.calorie_per_100g ?? 0),
  }), { sodium: 0, protein: 0, kcal: 0 });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-sm font-bold text-foreground">월간 반찬 추천</h2><Badge variant="outline">실제 API 연동</Badge>{isGenerating && <Badge variant="secondary">생성 중</Badge>}</div>
          <p className="mt-1 text-xs text-muted-foreground">{resident.name}님의 건강 프로필을 기준으로 매일 아침·점심·저녁 반찬을 추천합니다.</p>
        </div>
        <Button size="sm" onClick={generate} disabled={loading || requesting || isGenerating}>
          {requesting || isGenerating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {requesting || isGenerating ? "생성 중..." : hasRecommendations ? "다시 생성" : "월간 추천 생성"}
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b px-2 py-2">
            <Button variant="ghost" size="icon-sm" onClick={() => moveMonth(-1)}><ChevronLeft /><span className="sr-only">이전 달</span></Button>
            <div className="text-center"><p className="text-sm font-extrabold">{month.getFullYear()}년 {month.getMonth() + 1}월</p><p className="text-[11px] text-muted-foreground">{loading ? "조회 중" : hasRecommendations ? "추천 데이터 있음" : "추천 생성 전"}</p></div>
            <Button variant="ghost" size="icon-sm" onClick={() => moveMonth(1)}><ChevronRight /><span className="sr-only">다음 달</span></Button>
          </div>
          <div className="grid grid-cols-7 bg-muted/40">{WEEKDAYS.map((day) => <div key={day} className="py-1.5 text-center text-[11px] font-bold text-muted-foreground">{day}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const key = day ? dateKey(month, day) : null;
              const apiDay = key ? monthly?.days?.find((item) => item.service_date === key) : null;
              const mealCount = apiDay?.meals.filter((meal) => meal.items.length > 0).length ?? 0;
              return <button key={`${day ?? "empty"}-${index}`} type="button" disabled={!day} onClick={() => { if (key) { setSelectedDate(key); setSelectedMeal("breakfast"); } }} className={`min-h-16 border-t border-r p-1.5 text-left text-xs ${day ? "hover:bg-muted/50" : "bg-muted/20"} ${selectedDate === key ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""}`}>{day && <><span className="font-bold">{day}</span>{mealCount > 0 && <p className="mt-1 truncate text-[10px] text-emerald-700">{mealCount}식 추천</p>}</>}</button>;
            })}
          </div>
        </div>
        <div className="rounded-lg bg-sidebar p-4 text-sidebar-foreground">
          {!selectedDate ? <div className="flex min-h-48 items-center justify-center text-center text-sm text-sidebar-foreground/60">날짜를 선택하면<br />아침·점심·저녁 추천을 확인할 수 있습니다.</div> : <div className="space-y-3">
            <div><p className="text-xs font-bold text-sidebar-primary">{selectedDate} 추천</p><div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-sidebar-accent p-1">{MEAL_TYPES.map((meal) => <button key={meal.value} type="button" onClick={() => setSelectedMeal(meal.value)} className={`rounded-md px-2 py-1.5 text-xs font-bold ${selectedMeal === meal.value ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/60"}`}>{meal.label}</button>)}</div>
              <p className="mt-3 text-xs font-bold text-sidebar-foreground/60">{MEAL_TYPES.find((meal) => meal.value === selectedMeal)?.label} 반찬</p><div className="mt-1 flex flex-wrap gap-1.5">{selectedItems.length > 0 ? selectedItems.map((item) => <span key={`${item.banchan_id}-${item.slot_index}`} className="rounded-md bg-sidebar-accent px-2 py-1 text-sm font-extrabold">{item.name}</span>) : <span className="text-sm text-sidebar-foreground/60">아직 배정된 반찬이 없습니다.</span>}</div></div>
            {selectedItems.length > 0 && <><div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-sidebar-foreground/60">나트륨</p><p className="font-semibold">{Math.round(total.sodium)}mg</p></div><div><p className="text-sidebar-foreground/60">단백질</p><p className="font-semibold">{Math.round(total.protein)}g</p></div><div><p className="text-sidebar-foreground/60">열량</p><p className="font-semibold">{Math.round(total.kcal)}kcal</p></div></div><div className="border-t border-sidebar-border pt-3"><p className="text-xs font-bold">추천 근거</p>{selectedItems.map((item) => <p key={`${item.banchan_id}-reason`} className="mt-1 text-xs leading-5 text-sidebar-foreground/70"><strong>{item.name}</strong> · {item.reason ?? "추천 근거가 없습니다."}</p>)}<p className="mt-2 text-[11px] text-sidebar-foreground/50">질환: {detail.diagnoses.join(", ") || "없음"} · 알레르기: {detail.allergies.join(", ") || "없음"}</p></div></>}
          </div>}
        </div>
      </div>
      {selectedDate && selectedTargets && (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="text-sm font-extrabold">하루 영양 목표</p><p className="mt-0.5 text-xs text-muted-foreground">선택한 날짜가 속한 주의 건강 프로필 기준 목표입니다.</p></div>
            <Badge variant="secondary">{selectedDate}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "열량", value: selectedTargets.target_calorie_kcal, unit: "kcal", icon: Flame },
              { label: "단백질", value: selectedTargets.target_protein_g, unit: "g", icon: Beef },
              { label: "나트륨", value: selectedTargets.target_sodium_mg, unit: "mg", icon: Droplet },
              { label: "탄수화물", value: selectedTargets.target_carbs_g, unit: "g", icon: Wheat },
            ].map(({ label, value, unit, icon: Icon }) => (
              <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</div>
                <p className="mt-1 text-xl font-extrabold">{value == null ? "-" : Math.round(value).toLocaleString()}<span className="ml-0.5 text-xs font-semibold text-muted-foreground">{value == null ? "" : unit}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
      {selectedItems.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {selectedItems.map((item) => (
            <article key={`${item.banchan_id}-nutrition`} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{item.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p></div><Badge variant={item.suitability === "recommended" ? "secondary" : "outline"}>{item.suitability === "recommended" ? "추천" : item.suitability === "caution" ? "주의" : "피하기"}</Badge></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-md bg-muted px-2 py-1.5">열량 <strong>{item.calorie_per_100g ?? "-"}{item.calorie_per_100g == null ? "" : "kcal/100g"}</strong></span>
                <span className="rounded-md bg-muted px-2 py-1.5">단백질 <strong>{item.protein_per_100g ?? "-"}{item.protein_per_100g == null ? "" : "g"}</strong></span>
                <span className="rounded-md bg-muted px-2 py-1.5">나트륨 <strong>{item.sodium_per_100g ?? "-"}{item.sodium_per_100g == null ? "" : "mg"}</strong></span>
                <span className="rounded-md bg-muted px-2 py-1.5">탄수화물 <strong>{item.carbs_per_100g ?? "-"}{item.carbs_per_100g == null ? "" : "g"}</strong></span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
