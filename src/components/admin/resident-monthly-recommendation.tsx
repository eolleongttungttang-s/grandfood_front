"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResidentDetail } from "@/lib/admin-resident-detail";
import type { Resident } from "@/lib/admin-residents";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MEAL_TYPES = [
  { value: "breakfast", label: "아침" },
  { value: "lunch", label: "점심" },
  { value: "dinner", label: "저녁" },
] as const;
type MealType = (typeof MEAL_TYPES)[number]["value"];
const PREVIEW_MENUS = [
  {
    names: ["두부조림", "시금치나물", "연근조림"],
    sodium: 796,
    protein: 15,
    kcal: 298,
    reason: "질환별 영양 기준과 부드러운 식감을 고려한 저염 구성입니다.",
  },
  {
    names: ["계란찜", "애호박볶음", "새우살볶음"],
    sodium: 758,
    protein: 29,
    kcal: 330,
    reason: "단백질을 보강하고 채소 섭취 균형을 맞춘 구성입니다.",
  },
  {
    names: ["고등어조림", "콩나물무침", "미역줄기볶음"],
    sodium: 805,
    protein: 26,
    kcal: 331,
    reason: "양질의 단백질과 나트륨 섭취량을 함께 고려했습니다.",
  },
];

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function ResidentMonthlyRecommendation({
  resident,
  detail,
}: {
  resident: Resident;
  detail: ResidentDetail;
}) {
  const [month, setMonth] = useState(() => new Date());
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: last }, (_, index) => index + 1),
    ];
  }, [month]);
  const mealOffset = MEAL_TYPES.findIndex((meal) => meal.value === selectedMeal);
  const selectedMenu = selectedDay
    ? PREVIEW_MENUS[(selectedDay - 1 + mealOffset) % PREVIEW_MENUS.length]
    : null;

  function moveMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setGenerated(false);
    setSelectedDay(null);
    setSelectedMeal("breakfast");
  }

  function generatePreview() {
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
      setSelectedDay(1);
      setSelectedMeal("breakfast");
      toast.success(`${resident.name}님의 ${getMonthKey(month)} 추천 미리보기를 생성했습니다.`);
    }, 700);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">월간 반찬 추천</h2>
            <Badge variant="outline">API 연결 전 미리보기</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {resident.name}님의 질환·알레르기·활동량을 기준으로 월간 추천을 생성합니다.
          </p>
        </div>
        <Button size="sm" onClick={generatePreview} disabled={generating}>
          <Sparkles /> {generating ? "생성 중..." : generated ? "다시 생성" : "월간 추천 생성"}
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b px-2 py-2">
            <Button variant="ghost" size="icon-sm" onClick={() => moveMonth(-1)}><ChevronLeft /><span className="sr-only">이전 달</span></Button>
            <div className="text-center"><p className="text-sm font-extrabold">{month.getFullYear()}년 {month.getMonth() + 1}월</p><p className="text-[11px] text-muted-foreground">{generated ? "추천 생성 완료" : "추천 생성 전"}</p></div>
            <Button variant="ghost" size="icon-sm" onClick={() => moveMonth(1)}><ChevronRight /><span className="sr-only">다음 달</span></Button>
          </div>
          <div className="grid grid-cols-7 bg-muted/40">{WEEKDAYS.map((day) => <div key={day} className="py-1.5 text-center text-[11px] font-bold text-muted-foreground">{day}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((day, index) => (
              <button
                key={`${day ?? "empty"}-${index}`}
                type="button"
                disabled={!day || !generated}
                onClick={() => {
                  if (!day) return;
                  setSelectedDay(day);
                  setSelectedMeal("breakfast");
                }}
                className={`min-h-16 border-t border-r p-1.5 text-left text-xs ${day ? "hover:bg-muted/50" : "bg-muted/20"} ${selectedDay === day ? "bg-primary/10 ring-2 ring-inset ring-primary" : ""}`}
              >
                {day && <><span className="font-bold">{day}</span>{generated && <p className="mt-1 truncate text-[10px] text-emerald-700">3식 추천</p>}</>}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-sidebar p-4 text-sidebar-foreground">
          {!generated ? (
            <div className="flex min-h-48 items-center justify-center text-center text-sm text-sidebar-foreground/60">월간 추천을 생성하면<br />날짜별 반찬이 표시됩니다.</div>
          ) : !selectedMenu ? (
            <div className="flex min-h-48 items-center justify-center text-center text-sm text-sidebar-foreground/60">선택한 날짜에는<br />배정된 반찬이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-sidebar-primary">{month.getMonth() + 1}월 {selectedDay}일 추천</p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-sidebar-accent p-1">
                  {MEAL_TYPES.map((meal) => (
                    <button
                      key={meal.value}
                      type="button"
                      onClick={() => setSelectedMeal(meal.value)}
                      className={`rounded-md px-2 py-1.5 text-xs font-bold transition-colors ${selectedMeal === meal.value ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"}`}
                    >
                      {meal.label}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs font-bold text-sidebar-foreground/60">
                  {MEAL_TYPES.find((meal) => meal.value === selectedMeal)?.label} 반찬 3종
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedMenu.names.map((name) => (
                    <span key={name} className="rounded-md bg-sidebar-accent px-2 py-1 text-sm font-extrabold">{name}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs"><div><p className="text-sidebar-foreground/60">나트륨</p><p className="font-semibold">{selectedMenu.sodium}mg</p></div><div><p className="text-sidebar-foreground/60">단백질</p><p className="font-semibold">{selectedMenu.protein}g</p></div><div><p className="text-sidebar-foreground/60">열량</p><p className="font-semibold">{selectedMenu.kcal}kcal</p></div></div>
              <div className="border-t border-sidebar-border pt-3"><p className="text-xs font-bold">추천 근거</p><p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">{selectedMenu.reason}</p><p className="mt-2 text-[11px] text-sidebar-foreground/50">질환: {detail.diagnoses.join(", ") || "없음"} · 알레르기: {detail.allergies.join(", ") || "없음"}</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
