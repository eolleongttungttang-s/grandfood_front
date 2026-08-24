"use client";

import { useEffect, useMemo, useState } from "react";
import { Beef, CheckCircle2, ChevronLeft, ChevronRight, Droplet, Flame, LoaderCircle, Pencil, Printer, RefreshCw, Sparkles, Wheat, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchMonthlyRecommendation,
  fetchBanchanCatalog,
  generateMonthlyRecommendation,
  replaceFacilityRecommendationItem,
  updateDailyReviewStatus,
  type DailyReviewStatus,
  type DishCatalogItem,
  type FacilityMealType,
  type MealStaple,
  type MonthlyRecommendation,
  type RecommendationItem,
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

type NutritionTotal = { kcal: number; protein: number; sodium: number; carbs: number };
function nutritionTotal(items: Array<RecommendationItem | MealStaple>): NutritionTotal {
  return items.reduce((sum, item) => ({
    kcal: sum.kcal + (item.calorie_per_100g ?? 0),
    protein: sum.protein + (item.protein_per_100g ?? 0),
    sodium: sum.sodium + (item.sodium_per_100g ?? 0),
    carbs: sum.carbs + (item.carbs_per_100g ?? 0),
  }), { kcal: 0, protein: 0, sodium: 0, carbs: 0 });
}

function targetRate(value: number, target: number | null | undefined) {
  return target && target > 0 ? Math.round((value / target) * 100) : null;
}

export function ResidentMonthlyRecommendation({ resident, detail }: { resident: Resident; detail: ResidentDetail }) {
  const [month, setMonth] = useState(() => new Date());
  const [monthly, setMonthly] = useState<MonthlyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<FacilityMealType>("breakfast");
  const [swapTarget, setSwapTarget] = useState<RecommendationItem | null>(null);
  const [catalog, setCatalog] = useState<DishCatalogItem[]>([]);
  const [replacing, setReplacing] = useState(false);
  const [reviewUpdating, setReviewUpdating] = useState(false);
  const monthKey = getMonthKey(month);
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const calendarDays = [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: last }, (_, index) => index + 1),
    ];
    const trailingEmptyCount = (7 - (calendarDays.length % 7)) % 7;
    return [...calendarDays, ...Array.from({ length: trailingEmptyCount }, () => null)];
  }, [month]);
  const printableWeeks = useMemo(() => {
    const recommendationDays = monthly?.days ?? [];
    return Array.from(
      { length: Math.ceil(recommendationDays.length / 7) },
      (_, index) => recommendationDays.slice(index * 7, index * 7 + 7),
    );
  }, [monthly?.days]);
  const isGenerating = monthly?.weeks.some((week) => week.generation_status === "generating") ?? false;
  const hasRecommendations = monthly?.days?.some((day) => day.meals.some((meal) => meal.items.length > 0)) ?? false;
  const selectedDay = monthly?.days?.find((day) => day.service_date === selectedDate) ?? null;
  const selectedMealEntry = selectedDay?.meals.find((meal) => meal.meal_type === selectedMeal);
  const selectedItems = selectedMealEntry?.items ?? [];
  const selectedStaple = selectedMealEntry?.staple ?? null;
  const selectedTargets = selectedDate
    ? monthly?.weeks.find((week) => isDateInWeek(selectedDate, week.week_start_date))?.recommendation
    : null;
  const selectedDayItems = selectedDay?.meals.flatMap((meal) => meal.items) ?? [];
  const selectedDayStaples = selectedDay?.meals.flatMap((meal) => meal.staple ? [meal.staple] : []) ?? [];
  const selectedReviewStatus = selectedDay?.review_status ?? "pending";

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

  async function openSwap(item: RecommendationItem) {
    if (selectedReviewStatus === "confirmed") {
      toast.error("검수 완료된 날짜는 반찬을 변경할 수 없습니다.");
      return;
    }
    setSwapTarget(item);
    if (catalog.length > 0) return;
    try {
      setCatalog(await fetchBanchanCatalog());
    } catch (error) {
      setSwapTarget(null);
      toast.error(error instanceof Error ? error.message : "반찬 목록을 불러오지 못했습니다.");
    }
  }

  async function replaceItem(replacementBanchanId: string) {
    if (!swapTarget || !selectedDate) return;
    setReplacing(true);
    try {
      await replaceFacilityRecommendationItem(
        resident.id,
        selectedDate,
        selectedMeal,
        swapTarget.slot_index,
        replacementBanchanId,
      );
      setMonthly(await fetchMonthlyRecommendation(resident.id, monthKey));
      setSwapTarget(null);
      toast.success("반찬을 교체했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "반찬을 교체하지 못했습니다.");
    } finally {
      setReplacing(false);
    }
  }

  async function updateReview(status: DailyReviewStatus) {
    if (!selectedDate) return;
    setReviewUpdating(true);
    try {
      await updateDailyReviewStatus(resident.id, selectedDate, status);
      setMonthly(await fetchMonthlyRecommendation(resident.id, monthKey));
      const label = status === "confirmed" ? "검수 완료" : status === "rejected" ? "반려" : "검수 대기";
      toast.success(`${selectedDate} 식단을 ${label} 상태로 변경했습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "검수 상태를 저장하지 못했습니다.");
    } finally {
      setReviewUpdating(false);
    }
  }

  const total = nutritionTotal(selectedStaple ? [selectedStaple, ...selectedItems] : selectedItems);
  const dayTotal = nutritionTotal([...selectedDayStaples, ...selectedDayItems]);

  return (
    <>
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm print:hidden lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-sm font-bold text-foreground">월간 반찬 추천</h2><Badge variant="outline">실제 API 연동</Badge>{isGenerating && <Badge variant="secondary">생성 중</Badge>}</div>
          <p className="mt-1 text-xs text-muted-foreground">{resident.name}님의 건강 프로필을 기준으로 매일 아침·점심·저녁 반찬을 추천합니다.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => window.print()} disabled={!hasRecommendations}>
            <Printer />
            식단표 출력
          </Button>
          <Button size="sm" onClick={generate} disabled={loading || requesting || isGenerating}>
            {requesting || isGenerating ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
            {requesting || isGenerating ? "생성 중..." : hasRecommendations ? "다시 생성" : "월간 추천 생성"}
          </Button>
        </div>
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
              const reviewStatus = apiDay?.review_status ?? "pending";
              return <button key={`${day ?? "empty"}-${index}`} type="button" disabled={!day} onClick={() => { if (key) { setSelectedDate(key); setSelectedMeal("breakfast"); } }} className={`min-h-16 border-b border-r p-1.5 text-left text-xs ${day ? "hover:bg-muted/50" : "bg-muted/20"} ${selectedDate === key ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""}`}>{day && <><span className="font-bold">{day}</span>{mealCount > 0 && <p className="mt-1 truncate text-[10px] text-emerald-700">{mealCount}식 추천</p>}{mealCount > 0 && <p className={`mt-0.5 truncate text-[10px] font-semibold ${reviewStatus === "confirmed" ? "text-blue-700" : reviewStatus === "rejected" ? "text-amber-700" : "text-muted-foreground"}`}>{reviewStatus === "confirmed" ? "검수 완료" : reviewStatus === "rejected" ? "수정 필요" : "검수 대기"}</p>}</>}</button>;
            })}
          </div>
        </div>
        <div className="rounded-lg bg-sidebar p-4 text-sidebar-foreground">
          {!selectedDate ? <div className="flex min-h-48 items-center justify-center text-center text-sm text-sidebar-foreground/60">날짜를 선택하면<br />아침·점심·저녁 추천을 확인할 수 있습니다.</div> : <div className="space-y-3">
            <div><p className="text-xs font-bold text-sidebar-primary">{selectedDate} 추천</p><div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-sidebar-accent p-1">{MEAL_TYPES.map((meal) => <button key={meal.value} type="button" onClick={() => setSelectedMeal(meal.value)} className={`rounded-md px-2 py-1.5 text-xs font-bold ${selectedMeal === meal.value ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/60"}`}>{meal.label}</button>)}</div>
              <div className="mt-3 rounded-md border border-sidebar-border bg-sidebar-accent px-2.5 py-2 text-xs"><p className="text-sidebar-foreground/50">기본 주식</p><p className="mt-0.5 font-extrabold">{selectedStaple?.name ?? "정보 없음"}</p></div><p className="mt-3 text-xs font-bold text-sidebar-foreground/60">{MEAL_TYPES.find((meal) => meal.value === selectedMeal)?.label} 추천 반찬 3종</p><div className="mt-1 flex flex-wrap gap-1.5">{selectedItems.length > 0 ? selectedItems.map((item) => <span key={`${item.banchan_id}-${item.slot_index}`} className="rounded-md bg-sidebar-accent px-2 py-1 text-sm font-extrabold">{item.name}</span>) : <span className="text-sm text-sidebar-foreground/60">아직 배정된 반찬이 없습니다.</span>}</div></div>
            {selectedItems.length > 0 && <><div className="grid grid-cols-4 gap-2 text-xs"><div><p className="text-sidebar-foreground/60">열량</p><p className="font-semibold">{Math.round(total.kcal)}kcal</p></div><div><p className="text-sidebar-foreground/60">단백질</p><p className="font-semibold">{Math.round(total.protein)}g</p></div><div><p className="text-sidebar-foreground/60">나트륨</p><p className="font-semibold">{Math.round(total.sodium)}mg</p></div><div><p className="text-sidebar-foreground/60">탄수화물</p><p className="font-semibold">{Math.round(total.carbs)}g</p></div></div><p className="text-[10px] text-sidebar-foreground/50">기본 주식과 반찬별 100g 영양가 합산 기준</p><div className="border-t border-sidebar-border pt-3"><p className="text-xs font-bold">추천 근거</p>{selectedItems.map((item) => <p key={`${item.banchan_id}-reason`} className="mt-1 text-xs leading-5 text-sidebar-foreground/70"><strong>{item.name}</strong> · {item.reason ?? "추천 근거가 없습니다."}</p>)}<p className="mt-2 text-[11px] text-sidebar-foreground/50">질환: {detail.diagnoses.join(", ") || "없음"} · 알레르기: {detail.allergies.join(", ") || "없음"}</p></div></>}
            {selectedItems.length > 0 && <div className="border-t border-sidebar-border pt-3"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold">영양사 일별 검수</p><p className="mt-0.5 text-[10px] text-sidebar-foreground/50">반찬을 수정한 뒤 검수를 완료해 주세요.</p></div><Badge variant="outline">{selectedReviewStatus === "confirmed" ? "검수 완료" : selectedReviewStatus === "rejected" ? "수정 필요" : "검수 대기"}</Badge></div><div className="mt-2 grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="secondary" disabled={reviewUpdating || selectedReviewStatus === "confirmed"} onClick={() => void updateReview("confirmed")}><CheckCircle2 />검수 완료</Button><Button type="button" size="sm" variant="outline" className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground" disabled={reviewUpdating || selectedReviewStatus === "confirmed"} onClick={() => void openSwap(selectedItems[0])}><Pencil />수정</Button></div>{selectedReviewStatus !== "pending" && <Button type="button" size="sm" variant="ghost" className="mt-1 w-full" disabled={reviewUpdating} onClick={() => void updateReview("pending")}>검수 대기로 되돌리기</Button>}</div>}
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
      {selectedDate && selectedTargets && selectedDayItems.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><p className="text-sm font-extrabold">하루 추천 영양 합계</p><p className="mt-0.5 text-xs text-muted-foreground">아침·점심·저녁의 기본 주식과 추천 반찬 영양가를 합산합니다.</p></div>
            <Badge variant="outline">100g 기준</Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "열량", value: dayTotal.kcal, target: selectedTargets.target_calorie_kcal, unit: "kcal" },
              { label: "단백질", value: dayTotal.protein, target: selectedTargets.target_protein_g, unit: "g" },
              { label: "나트륨", value: dayTotal.sodium, target: selectedTargets.target_sodium_mg, unit: "mg" },
              { label: "탄수화물", value: dayTotal.carbs, target: selectedTargets.target_carbs_g, unit: "g" },
            ].map(({ label, value, target, unit }) => {
              const rate = targetRate(value, target);
              return <div key={label} className="rounded-lg bg-muted/50 px-4 py-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-muted-foreground">{label}</span><span className="font-bold text-primary">{rate == null ? "-" : `${rate}%`}</span></div><p className="mt-1 text-lg font-extrabold">{Math.round(value).toLocaleString()}{unit}<span className="ml-1 text-xs font-medium text-muted-foreground">/ {target == null ? "-" : Math.round(target).toLocaleString()}{target == null ? "" : unit}</span></p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(rate ?? 0, 100)}%` }} /></div></div>;
            })}
          </div>
        </div>
      )}
      {selectedItems.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {selectedItems.map((item) => (
            <article key={`${item.banchan_id}-nutrition`} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold">{item.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p></div><div className="flex items-center gap-1"><Badge variant={item.suitability === "recommended" ? "secondary" : "outline"}>{item.suitability === "recommended" ? "추천" : item.suitability === "caution" ? "주의" : "피하기"}</Badge><Button type="button" size="icon-sm" variant="ghost" disabled={selectedReviewStatus === "confirmed"} onClick={() => void openSwap(item)} title={selectedReviewStatus === "confirmed" ? "검수 완료된 식단입니다" : "다른 반찬으로 교체"}><RefreshCw /><span className="sr-only">{item.name} 교체</span></Button></div></div>
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
      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <section role="dialog" aria-modal="true" aria-labelledby="banchan-swap-title" className="max-h-full w-full max-w-2xl overflow-hidden rounded-2xl bg-card shadow-2xl">
            <header className="flex items-start justify-between border-b border-border px-6 py-5"><div><h2 id="banchan-swap-title" className="text-xl font-bold">추천 반찬 수정</h2><p className="mt-1 text-sm text-muted-foreground">{selectedDate} {MEAL_TYPES.find((meal) => meal.value === selectedMeal)?.label} · 바꿀 반찬과 새 반찬을 차례로 선택해 주세요.</p></div><Button type="button" variant="ghost" size="icon-sm" onClick={() => setSwapTarget(null)} disabled={replacing}><X /><span className="sr-only">닫기</span></Button></header>
            <div className="max-h-[65vh] overflow-y-auto p-6"><div><p className="text-xs font-bold text-muted-foreground">현재 추천 반찬</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{selectedItems.map((item) => <button key={`${item.banchan_id}-${item.slot_index}-target`} type="button" disabled={replacing} onClick={() => setSwapTarget(item)} className={`rounded-lg border p-3 text-left text-sm transition-colors ${swapTarget.slot_index === item.slot_index ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:bg-muted"}`}><span className="font-extrabold">{item.slot_index}. {item.name}</span><span className="mt-1 block text-xs text-muted-foreground">{item.category}</span></button>)}</div></div><div className="my-5 border-t border-border" /><p className="mb-2 text-xs font-bold text-muted-foreground"><strong className="text-foreground">{swapTarget.name}</strong> 대신 선택할 반찬</p><div className="grid gap-2 sm:grid-cols-2">{catalog.filter((dish) => dish.category !== "밥류" && dish.id !== swapTarget.banchan_id && !selectedItems.some((item) => item.banchan_id === dish.id)).map((dish) => <button key={dish.id} type="button" disabled={replacing} onClick={() => void replaceItem(dish.id)} className="rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"><div className="flex items-center justify-between gap-2"><strong>{dish.name}</strong><Badge variant="outline">{dish.category}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{dish.kcal ?? "-"}kcal · 단백질 {dish.proteinG ?? "-"}g · 나트륨 {dish.sodiumMg ?? "-"}mg</p></button>)}</div></div>
          </section>
        </div>
      )}
    </div>
    <section className="hidden bg-white text-black print:absolute print:inset-0 print:z-[9999] print:block print:w-full print:p-4">
      {printableWeeks.map((week, weekIndex) => (
        <article key={`print-week-${weekIndex}`} className={weekIndex < printableWeeks.length - 1 ? "break-after-page" : ""}>
          <header className="mb-4 border-b-2 border-black pb-3 text-center">
            <h1 className="text-xl font-extrabold">{resident.name} 월간 식단표</h1>
            <p className="mt-1 text-xs">{month.getFullYear()}년 {month.getMonth() + 1}월 · {weekIndex + 1}주차 · 아침·점심·저녁</p>
          </header>
          <table className="w-full table-fixed border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="w-20 border border-black bg-slate-100 px-2 py-2">날짜</th>
                {MEAL_TYPES.map((meal) => <th key={meal.value} className="border border-black bg-slate-100 px-2 py-2">{meal.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {week.map((day) => {
                const parsedDate = new Date(`${day.service_date}T00:00:00`);
                return (
                  <tr key={day.service_date} className="break-inside-avoid">
                    <th className="border border-black px-2 py-2 text-left align-top leading-4">
                      {parsedDate.getMonth() + 1}/{parsedDate.getDate()} ({WEEKDAYS[parsedDate.getDay()]})
                    </th>
                    {MEAL_TYPES.map((meal) => {
                      const mealEntry = day.meals.find((item) => item.meal_type === meal.value);
                      const items = mealEntry?.items ?? [];
                      const names = [...(mealEntry?.staple ? [mealEntry.staple.name] : []), ...items.map((item) => item.name)];
                      return <td key={meal.value} className="border border-black px-2 py-2 align-top leading-4 whitespace-normal break-words">{names.length > 0 ? names.map((name, index) => <span key={`${name}-${index}`} className="block">{name}</span>) : "-"}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[9px] leading-4 text-slate-600">대상자의 건강 프로필을 기준으로 생성된 추천 식단이며, 필요 시 담당 영양사가 조정할 수 있습니다.</p>
        </article>
      ))}
    </section>
    </>
  );
}
