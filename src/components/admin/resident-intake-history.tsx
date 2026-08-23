"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { readAdminSession } from "@/lib/admin-auth";
import { extractErrorMessage, getApiUrl } from "@/lib/api";

type DietDish = {
  banchan_id: string;
  banchan_name: string | null;
  leftover_pct: number;
};

type DietEntry = {
  meal_id: string;
  meal_date: string;
  meal_type: string;
  completed: boolean;
  recorded: boolean;
  quick_check_status: string | null;
  dishes: DietDish[];
};

type DietHistoryResponse = { items: DietEntry[] };

const MEAL_LABEL: Record<string, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
};

function recentDateKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}

function intakeRate(entries: DietEntry[]) {
  const dishes = entries.filter((entry) => entry.completed).flatMap((entry) => entry.dishes);
  if (dishes.length > 0) {
    return Math.round(dishes.reduce((sum, dish) => sum + (100 - dish.leftover_pct), 0) / dishes.length);
  }
  if (entries.some((entry) => entry.quick_check_status === "완식")) return 100;
  if (entries.some((entry) => entry.quick_check_status === "남김")) return 50;
  return null;
}

function dayLabel(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function ResidentIntakeHistory({ residentId }: { residentId: string }) {
  const dates = useMemo(() => recentDateKeys(14), []);
  const [items, setItems] = useState<DietEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(dates.at(-1) ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const session = readAdminSession();
      if (!session?.accessToken) {
        setError("관리자 로그인 정보가 없습니다.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(
          `${getApiUrl()}/app/elder/${encodeURIComponent(residentId)}/diet-history?days=14`,
          { headers: { Authorization: `Bearer ${session.accessToken}` }, signal: controller.signal },
        );
        const result = await response.json().catch(() => null) as DietHistoryResponse | Record<string, unknown> | null;
        if (!response.ok) throw new Error(extractErrorMessage(result, "섭취 기록을 불러오지 못했습니다."));
        setItems((result as DietHistoryResponse).items ?? []);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "섭취 기록을 불러오지 못했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [residentId]);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, DietEntry[]>();
    for (const item of items) map.set(item.meal_date, [...(map.get(item.meal_date) ?? []), item]);
    return map;
  }, [items]);
  const recentSeven = dates.slice(-7);
  const selectedEntries = entriesByDate.get(selectedDate) ?? [];
  const selectedRate = intakeRate(selectedEntries);

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card"><LoaderCircle className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-foreground">최근 7일 섭취 달성률</h2>
        <p className="mt-1 text-xs text-muted-foreground">식전·식후 이미지의 반찬별 잔반 분석을 기준으로 계산합니다.</p>
      </div>
      {error ? (
        <div className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-2">
            {recentSeven.map((date) => {
              const rate = intakeRate(entriesByDate.get(date) ?? []);
              return (
                <div key={date} className="flex min-w-0 flex-col items-center gap-1.5">
                  <span className="h-5 text-xs font-bold">{rate === null ? "—" : `${rate}%`}</span>
                  <div className="flex h-24 w-full items-end overflow-hidden rounded-lg bg-muted">
                    {rate !== null && <div className="w-full rounded-t-md bg-amber-700/70" style={{ height: `${Math.max(rate, 6)}%` }} />}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{dayLabel(date)}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-foreground">최근 14일 섭취 기록</h2>
              <div className="flex gap-1.5 text-[11px]"><Badge variant="outline">완식</Badge><Badge variant="secondary">남김</Badge></div>
            </div>
            <div className="grid grid-cols-7 gap-2 md:grid-cols-14">
              {dates.map((date) => {
                const rate = intakeRate(entriesByDate.get(date) ?? []);
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${selectedDate === date ? "border-foreground bg-foreground text-background" : rate === null ? "bg-muted text-muted-foreground" : rate >= 90 ? "bg-amber-100 text-amber-950" : "bg-orange-50 text-orange-900"}`}
                  >
                    {Number(date.slice(-2))}일
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">{selectedDate.replaceAll("-", ". ")}</h3>
              <Badge variant={selectedRate === null ? "outline" : selectedRate >= 90 ? "default" : "secondary"}>
                {selectedRate === null ? "기록 없음" : `평균 ${selectedRate}% 섭취`}
              </Badge>
            </div>
            {selectedEntries.length === 0 ? (
              <div className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><UtensilsCrossed className="h-4 w-4" />이 날짜에는 분석된 식사 기록이 없습니다.</div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {selectedEntries.map((entry) => (
                  <article key={entry.meal_id} className="rounded-xl bg-muted p-3">
                    <div className="flex justify-between"><strong className="text-sm">{MEAL_LABEL[entry.meal_type] ?? entry.meal_type}</strong><span className="text-xs text-muted-foreground">{entry.completed ? "분석 완료" : entry.recorded ? entry.quick_check_status ?? "기록됨" : "분석 대기"}</span></div>
                    <div className="mt-2 space-y-1.5">
                      {entry.dishes.length === 0 ? <p className="text-xs text-muted-foreground">반찬별 분석 결과가 없습니다.</p> : entry.dishes.map((dish) => (
                        <div key={`${entry.meal_id}-${dish.banchan_id}`} className="flex justify-between gap-2 text-xs"><span>{dish.banchan_name ?? "반찬명 미확인"}</span><span className="font-semibold">{Math.round(100 - dish.leftover_pct)}% 섭취</span></div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
