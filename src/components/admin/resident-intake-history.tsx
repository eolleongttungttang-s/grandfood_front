"use client";
/* eslint-disable react-hooks/preserve-manual-memoization -- derived intake maps are intentionally cached by source state */

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, LoaderCircle, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readAdminSession } from "@/lib/admin-auth";
import { extractErrorMessage, getApiUrl } from "@/lib/api";
import {
  fetchBanchanCatalog,
  fetchMonthlyRecommendation,
  type DishCatalogItem,
  type MonthlyRecommendation,
} from "@/lib/admin-monthly-recommendation-api";
import { DEMO_RESIDENT_ID } from "@/lib/admin-residents";
import { recommendationForDate } from "@/lib/admin-recommendation-date";
import {
  fetchDailyNutritionActuals,
  nutrientActual,
  type DailyNutritionActuals,
} from "@/lib/admin-intake-api";

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

const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;

function preferredEntry(current: DietEntry | undefined, candidate: DietEntry) {
  if (!current) return candidate;
  const currentScore = Number(current.completed) * 100 + current.dishes.length;
  const candidateScore = Number(candidate.completed) * 100 + candidate.dishes.length;
  return candidateScore > currentScore ? candidate : current;
}

function oneEntryPerMeal(entries: DietEntry[]) {
  const byMealType = new Map<string, DietEntry>();
  for (const entry of entries) {
    byMealType.set(entry.meal_type, preferredEntry(byMealType.get(entry.meal_type), entry));
  }
  return MEAL_TYPES.flatMap((mealType) => {
    const entry = byMealType.get(mealType);
    return entry ? [entry] : [];
  });
}

function recentDateKeys(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}

function currentWeekDateKeys() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return dateKey(date);
  });
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKeysBetween(startDate: string, endDate: string) {
  const start = dateFromKey(startDate);
  const end = dateFromKey(endDate);
  if (start > end) return [];
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(dateKey(cursor));
  }
  return dates;
}

function daysBetween(startDate: string, endDate: string) {
  return Math.floor((dateFromKey(endDate).getTime() - dateFromKey(startDate).getTime()) / 86_400_000) + 1;
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

function todayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function isPastDate(dateKey: string) {
  return dateKey < todayKey();
}

function isWithinRegisteredPeriod(dateKey: string, registeredAt?: string) {
  return Boolean(registeredAt && dateKey >= registeredAt.slice(0, 10));
}

function dailyIntakeRate(dateKey: string, entries: DietEntry[], registeredAt?: string) {
  const measuredRates = entries
    .map((entry) => intakeRate([entry]))
    .filter((rate): rate is number => rate !== null);
  if (measuredRates.length > 0) {
    return Math.round(measuredRates.reduce((sum, rate) => sum + rate, 0) / measuredRates.length);
  }
  return isPastDate(dateKey) && isWithinRegisteredPeriod(dateKey, registeredAt) && entries.length === 0
    ? 0
    : null;
}

function dayLabel(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(dateFromKey(dateKey));
  return `${weekday} ${Number(month)}/${Number(day)}`;
}

function calculateNutrition(entries: DietEntry[], catalogById: Record<string, DishCatalogItem>) {
  return entries
    .flatMap((entry) => entry.dishes)
    .reduce(
      (total, dish) => {
        const nutrition = catalogById[dish.banchan_id];
        const intakeRatio = Math.max(0, Math.min(1, (100 - dish.leftover_pct) / 100));
        return {
          calorie: total.calorie + (nutrition?.kcal ?? 0) * intakeRatio,
          protein: total.protein + (nutrition?.proteinG ?? 0) * intakeRatio,
          sodium: total.sodium + (nutrition?.sodiumMg ?? 0) * intakeRatio,
        };
      },
      { calorie: 0, protein: 0, sodium: 0 },
    );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function NutritionMetricCard({
  label,
  value,
  target,
  unit,
  targetAvailable = true,
  className = "bg-background p-3",
}: {
  label: string;
  value: number;
  target: number | null | undefined;
  unit: string;
  targetAvailable?: boolean;
  className?: string;
}) {
  const hasTarget = targetAvailable && target != null && target > 0;
  const rate = hasTarget ? Math.round((value / target) * 100) : null;
  return (
    <div className={`rounded-lg border ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <strong className="text-xs text-muted-foreground">{label}</strong>
        <span className="text-xs font-bold">{rate == null ? "—" : `${rate}%`}</span>
      </div>
      <p className="mt-2 text-lg font-extrabold">
        {Math.round(value).toLocaleString()}{unit}
        <span className="ml-1 text-xs font-medium text-muted-foreground">
          / {hasTarget ? `${Math.round(target).toLocaleString()}${unit}` : "목표 없음"}
        </span>
      </p>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${Math.min(rate ?? 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function ResidentIntakeHistory({
  residentId,
  residentName,
  registeredAt,
}: {
  residentId: string;
  residentName: string;
  registeredAt?: string;
}) {
  const initialDates = useMemo(() => recentDateKeys(14), []);
  const [startDate, setStartDate] = useState(initialDates[0]);
  const [endDate, setEndDate] = useState(initialDates.at(-1) ?? todayKey());
  const dates = useMemo(() => dateKeysBetween(startDate, endDate), [startDate, endDate]);
  const [items, setItems] = useState<DietEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(endDate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<DishCatalogItem[]>([]);
  const [recommendationsByMonth, setRecommendationsByMonth] = useState<Record<string, MonthlyRecommendation>>({});
  const [nutritionActualsByDate, setNutritionActualsByDate] = useState<Record<string, DailyNutritionActuals>>({});
  const nutritionActualsCache = useRef<Record<string, DailyNutritionActuals>>({});
  const [activeTab, setActiveTab] = useState<"summary" | "history" | "nutrition">("history");
  const [historyRevision, setHistoryRevision] = useState(0);

  useEffect(() => {
    const handleMealUpdate = (event: Event) => {
      const updatedResidentId = (event as CustomEvent<{ residentId?: string }>).detail?.residentId;
      if (updatedResidentId === residentId) {
        for (const key of Object.keys(nutritionActualsCache.current)) {
          if (key.startsWith(`${residentId}:`)) delete nutritionActualsCache.current[key];
        }
        setNutritionActualsByDate({});
        setHistoryRevision((current) => current + 1);
      }
    };
    window.addEventListener("grandfood:meal-log-updated", handleMealUpdate);
    return () => window.removeEventListener("grandfood:meal-log-updated", handleMealUpdate);
  }, [residentId]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      const session = readAdminSession();
      if (!session?.accessToken) {
        setError("관리자 로그인 정보가 없습니다.");
        setLoading(false);
        return;
      }
      try {
        const fetchDays = Math.max(7, daysBetween(startDate, todayKey()));
        if (residentId === DEMO_RESIDENT_ID) {
          const demoExcludedKeywords = ["가지", "우유", "땅콩"];
          const allDemoDishes = (await fetchBanchanCatalog()).filter((dish) =>
            dish.category !== "밥류"
            && !demoExcludedKeywords.some((keyword) => dish.name.includes(keyword))
          );
          const lowSodiumDemoDishes = allDemoDishes
            .filter((dish) => dish.sodiumMg !== null && dish.sodiumMg <= 300)
            .sort((a, b) => (a.sodiumMg ?? 0) - (b.sodiumMg ?? 0));
          const demoCatalog = lowSodiumDemoDishes.length >= 6
            ? lowSodiumDemoDishes
            : [...allDemoDishes].sort((a, b) => (a.sodiumMg ?? Number.MAX_SAFE_INTEGER) - (b.sodiumMg ?? Number.MAX_SAFE_INTEGER));
          const demoDates = recentDateKeys(fetchDays);
          const demoItems = demoDates.flatMap((date, dateIndex) =>
            MEAL_TYPES.map((mealType, mealIndex): DietEntry => ({
              meal_id: `demo-${date}-${mealType}`,
              meal_date: date,
              meal_type: mealType,
              completed: date < todayKey() || mealIndex === 0,
              recorded: date < todayKey() || mealIndex === 0,
              quick_check_status: null,
              dishes: Array.from({ length: 3 }, (_, dishIndex) => {
                const dish = demoCatalog[(dateIndex * 9 + mealIndex * 3 + dishIndex) % Math.max(demoCatalog.length, 1)];
                const result: DietDish | null = dish ? {
                  banchan_id: dish.id,
                  banchan_name: dish.name,
                  leftover_pct: [8, 18, 27, 35, 12, 22][(dateIndex + mealIndex + dishIndex) % 6],
                } : null;
                return result;
              }).filter((dish): dish is DietDish => dish !== null),
            })),
          );
          setItems(demoItems);
          return;
        }
        const response = await fetch(
          `${getApiUrl()}/app/elder/${encodeURIComponent(residentId)}/diet-history?days=${fetchDays}`,
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
  }, [residentId, startDate, historyRevision]);

  useEffect(() => {
    let cancelled = false;
    void fetchBanchanCatalog()
      .then((result) => {
        if (!cancelled) setCatalog(result);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendationMonths = useMemo(() => [...new Set([
    selectedDate.slice(0, 7),
    ...currentWeekDateKeys().map((date) => date.slice(0, 7)),
  ])], [selectedDate]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(recommendationMonths.map((month) => fetchMonthlyRecommendation(residentId, month)))
      .then((results) => {
        if (!cancelled) setRecommendationsByMonth(
          Object.fromEntries(results.map((result) => [result.month, result])),
        );
      })
      .catch(() => {
        if (!cancelled) setRecommendationsByMonth({});
      });
    return () => {
      cancelled = true;
    };
  }, [residentId, recommendationMonths]);

  const nutritionDates = useMemo(() => [...new Set([
    selectedDate,
    ...currentWeekDateKeys(),
  ])], [selectedDate]);

  useEffect(() => {
    if (residentId === DEMO_RESIDENT_ID) return;
    let cancelled = false;
    const missingDates = nutritionDates.filter(
      (date) => !nutritionActualsCache.current[`${residentId}:${date}`],
    );
    if (missingDates.length === 0) {
      setNutritionActualsByDate(Object.fromEntries(nutritionDates.flatMap((date) => {
        const item = nutritionActualsCache.current[`${residentId}:${date}`];
        return item ? [[date, item]] : [];
      })));
      return;
    }
    void Promise.all(missingDates.map((date) =>
      fetchDailyNutritionActuals(residentId, date).catch(() => null),
    )).then((results) => {
      if (cancelled) return;
      results.forEach((result, index) => {
        if (result) nutritionActualsCache.current[`${residentId}:${missingDates[index]}`] = result;
      });
      setNutritionActualsByDate(Object.fromEntries(nutritionDates.flatMap((date) => {
        const item = nutritionActualsCache.current[`${residentId}:${date}`];
        return item ? [[date, item]] : [];
      })));
    });
    return () => {
      cancelled = true;
    };
  }, [residentId, nutritionDates, historyRevision]);

  function selectRecentPeriod(days: number) {
    const periodDates = recentDateKeys(days);
    setStartDate(periodDates[0]);
    setEndDate(periodDates.at(-1) ?? todayKey());
    setSelectedDate(periodDates.at(-1) ?? todayKey());
  }

  async function printIntakeReport() {
    const reportWindow = window.open("", "_blank", "width=1100,height=800");
    if (!reportWindow) return;
    reportWindow.document.write("<p style='font-family:sans-serif;padding:30px'>섭취 분석 리포트를 준비하고 있습니다.</p>");
    const reportEntries = dates.flatMap((date) => entriesByDate[date] ?? []);
    const reportActuals = residentId === DEMO_RESIDENT_ID
      ? []
      : await Promise.all(dates.map((date) =>
          fetchDailyNutritionActuals(residentId, date).catch(() => null),
        ));
    const reportNutrition = residentId === DEMO_RESIDENT_ID
      ? calculateNutrition(reportEntries, catalogById)
      : reportActuals.reduce((total, actuals) => ({
          calorie: total.calorie + (nutrientActual(actuals, "calorie")?.amount ?? 0),
          protein: total.protein + (nutrientActual(actuals, "protein")?.amount ?? 0),
          sodium: total.sodium + (nutrientActual(actuals, "sodium")?.amount ?? 0),
        }), { calorie: 0, protein: 0, sodium: 0 });
    const reportMonths = await Promise.all(
      [...new Set(dates.map((date) => date.slice(0, 7)))].map((month) =>
        fetchMonthlyRecommendation(residentId, month).catch(() => null),
      ),
    );
    const reportTargets = dates.reduce((total, date, index) => {
      const recommendationTarget = recommendationForDate(
        reportMonths.find((item) => item?.month === date.slice(0, 7)) ?? null,
        date,
      );
      const actuals = reportActuals[index];
      const calorieTarget = residentId === DEMO_RESIDENT_ID
        ? recommendationTarget?.target_calorie_kcal
        : nutrientActual(actuals, "calorie")?.target_amount ?? recommendationTarget?.target_calorie_kcal;
      const proteinTarget = residentId === DEMO_RESIDENT_ID
        ? recommendationTarget?.target_protein_g
        : nutrientActual(actuals, "protein")?.target_amount ?? recommendationTarget?.target_protein_g;
      const sodiumTarget = residentId === DEMO_RESIDENT_ID
        ? recommendationTarget?.target_sodium_mg
        : nutrientActual(actuals, "sodium")?.target_amount ?? recommendationTarget?.target_sodium_mg;
      const hasTargets = [calorieTarget, proteinTarget, sodiumTarget].every((target) => target != null);
      return {
        calorie: total.calorie + (calorieTarget ?? 0),
        protein: total.protein + (proteinTarget ?? 0),
        sodium: total.sodium + (sodiumTarget ?? 0),
        availableDays: total.availableDays + Number(hasTargets),
      };
    }, { calorie: 0, protein: 0, sodium: 0, availableDays: 0 });
    const metricValue = (value: number, target: number, unit: string) => {
      const hasTarget = reportTargets.availableDays === dates.length && target > 0;
      const rate = hasTarget ? Math.round((value / target) * 100) : null;
      return `${Math.round(value).toLocaleString()}${unit} / ${hasTarget ? `${Math.round(target).toLocaleString()}${unit}` : "목표 없음"}${rate == null ? "" : ` (${rate}%)`}`;
    };
    const measuredRates = dates
      .map((date) => dailyIntakeRate(date, entriesByDate[date] ?? [], registeredAt))
      .filter((rate): rate is number => rate !== null);
    const averageRate = measuredRates.length > 0
      ? Math.round(measuredRates.reduce((sum, rate) => sum + rate, 0) / measuredRates.length)
      : null;
    const rows = dates.map((date) => {
      const entries = entriesByDate[date] ?? [];
      const cells = MEAL_TYPES.map((mealType) => {
        const entry = entries.find((item) => item.meal_type === mealType);
        if (!entry) return isPastDate(date) && isWithinRegisteredPeriod(date, registeredAt) ? "미섭취" : "기록 없음";
        if (entry.dishes.length === 0) return escapeHtml(entry.quick_check_status ?? "분석 결과 없음");
        return entry.dishes.map((dish) => `${escapeHtml(dish.banchan_name ?? "반찬명 미확인")} ${Math.round(100 - dish.leftover_pct)}%`).join("<br>");
      });
      const rate = dailyIntakeRate(date, entries, registeredAt);
      return `<tr><th>${escapeHtml(date)}</th>${cells.map((cell) => `<td>${cell}</td>`).join("")}<td>${rate == null ? "—" : `${rate}%`}</td></tr>`;
    }).join("");
    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(residentName)} 섭취 분석 리포트</title><style>body{font-family:Arial,'Noto Sans KR',sans-serif;color:#211812;padding:30px}h1{text-align:center;margin:0 0 6px}.meta{text-align:center;color:#6b625d;margin-bottom:24px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px}.card{border:1px solid #d8cec7;border-radius:10px;padding:12px}.label{font-size:12px;color:#776d67}.value{font-size:16px;font-weight:800;margin-top:5px;white-space:nowrap}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #bfb5ae;padding:9px;vertical-align:top}thead th{background:#f3ece7}tbody th{white-space:nowrap;background:#faf7f4}.note{margin-top:16px;color:#776d67;font-size:10px}@media print{body{padding:0}}</style></head><body><h1>${escapeHtml(residentName)} 섭취 분석 리포트</h1><p class="meta">${escapeHtml(startDate)} ~ ${escapeHtml(endDate)}</p><div class="summary"><div class="card"><div class="label">평균 섭취율</div><div class="value">${averageRate == null ? "—" : `${averageRate}%`}</div></div><div class="card"><div class="label">섭취 열량 / 기간 목표</div><div class="value">${metricValue(reportNutrition.calorie, reportTargets.calorie, "kcal")}</div></div><div class="card"><div class="label">섭취 단백질 / 기간 목표</div><div class="value">${metricValue(reportNutrition.protein, reportTargets.protein, "g")}</div></div><div class="card"><div class="label">섭취 나트륨 / 기간 목표</div><div class="value">${metricValue(reportNutrition.sodium, reportTargets.sodium, "mg")}</div></div></div><table><thead><tr><th>날짜</th><th>아침</th><th>점심</th><th>저녁</th><th>일일 섭취율</th></tr></thead><tbody>${rows}</tbody></table><p class="note">실제 대상자의 영양 섭취량은 서버에 저장된 날짜별 최신 분석 집계를 사용합니다. 목표 총량은 선택 기간의 하루 목표를 합산했습니다.</p><script>window.onload=()=>window.print();<\/script></body></html>`);
    reportWindow.document.close();
  }

  const entriesByDate = useMemo(() => {
    const grouped: Record<string, DietEntry[]> = {};
    for (const item of items) {
      grouped[item.meal_date] = [...(grouped[item.meal_date] ?? []), item];
    }
    return Object.fromEntries(
      Object.entries(grouped).map(([date, entries]) => [date, oneEntryPerMeal(entries)]),
    );
  }, [items]);
  const recentSeven = useMemo(() => currentWeekDateKeys(), []);
  const selectedEntries = useMemo(
    () => entriesByDate[selectedDate] ?? [],
    [entriesByDate, selectedDate],
  );
  const selectedRate = dailyIntakeRate(selectedDate, selectedEntries, registeredAt);
  const selectedDateIsMissed =
    isPastDate(selectedDate) && isWithinRegisteredPeriod(selectedDate, registeredAt);
  const catalogById = useMemo(
    () => Object.fromEntries(catalog.map((dish) => [dish.id, dish])),
    [catalog],
  );
  const estimatedNutrition = useMemo(
    () => calculateNutrition(selectedEntries, catalogById),
    [selectedEntries, catalogById],
  );
  const recentSevenEntries = useMemo(
    () => recentSeven.flatMap((date) => entriesByDate[date] ?? []),
    [recentSeven, entriesByDate],
  );
  const estimatedRecentSevenNutrition = useMemo(
    () => calculateNutrition(recentSevenEntries, catalogById),
    [recentSevenEntries, catalogById],
  );
  const selectedActuals = nutritionActualsByDate[selectedDate];
  const actualNutrition = residentId === DEMO_RESIDENT_ID
    ? estimatedNutrition
    : {
        calorie: nutrientActual(selectedActuals, "calorie")?.amount ?? 0,
        protein: nutrientActual(selectedActuals, "protein")?.amount ?? 0,
        sodium: nutrientActual(selectedActuals, "sodium")?.amount ?? 0,
      };
  const recentSevenNutrition = residentId === DEMO_RESIDENT_ID
    ? estimatedRecentSevenNutrition
    : recentSeven.reduce((total, date) => ({
        calorie: total.calorie + (nutrientActual(nutritionActualsByDate[date], "calorie")?.amount ?? 0),
        protein: total.protein + (nutrientActual(nutritionActualsByDate[date], "protein")?.amount ?? 0),
        sodium: total.sodium + (nutrientActual(nutritionActualsByDate[date], "sodium")?.amount ?? 0),
      }), { calorie: 0, protein: 0, sodium: 0 });
  const hasRecentNutrition = residentId === DEMO_RESIDENT_ID
    ? recentSevenEntries.some((entry) => entry.dishes.length > 0)
    : recentSeven.some((date) => (nutritionActualsByDate[date]?.nutrients.length ?? 0) > 0);
  const recommendationRecentTargets = useMemo(() => recentSeven.reduce(
    (total, date) => {
      const target = recommendationForDate(
        recommendationsByMonth[date.slice(0, 7)] ?? null,
        date,
      );
      return {
        calorie: total.calorie + (target?.target_calorie_kcal ?? 0),
        protein: total.protein + (target?.target_protein_g ?? 0),
        sodium: total.sodium + (target?.target_sodium_mg ?? 0),
        availableDays: total.availableDays + Number(Boolean(target)),
      };
    },
    { calorie: 0, protein: 0, sodium: 0, availableDays: 0 },
  ), [recentSeven, recommendationsByMonth]);
  const recentTargets = residentId === DEMO_RESIDENT_ID
    ? recommendationRecentTargets
    : recentSeven.reduce((total, date) => {
        const actuals = nutritionActualsByDate[date];
        const calorie = nutrientActual(actuals, "calorie");
        const protein = nutrientActual(actuals, "protein");
        const sodium = nutrientActual(actuals, "sodium");
        const recommendation = recommendationForDate(
          recommendationsByMonth[date.slice(0, 7)] ?? null,
          date,
        );
        const calorieTarget = calorie?.target_amount ?? recommendation?.target_calorie_kcal;
        const proteinTarget = protein?.target_amount ?? recommendation?.target_protein_g;
        const sodiumTarget = sodium?.target_amount ?? recommendation?.target_sodium_mg;
        const hasTargets = [calorieTarget, proteinTarget, sodiumTarget].every((target) => target != null);
        return {
          calorie: total.calorie + (calorieTarget ?? 0),
          protein: total.protein + (proteinTarget ?? 0),
          sodium: total.sodium + (sodiumTarget ?? 0),
          availableDays: total.availableDays + Number(hasTargets),
        };
      }, { calorie: 0, protein: 0, sodium: 0, availableDays: 0 });
  const recommendationTargets = recommendationForDate(
    recommendationsByMonth[selectedDate.slice(0, 7)] ?? null,
    selectedDate,
  );
  const targets = residentId === DEMO_RESIDENT_ID
    ? recommendationTargets
    : {
        target_calorie_kcal: nutrientActual(selectedActuals, "calorie")?.target_amount
          ?? recommendationTargets?.target_calorie_kcal
          ?? null,
        target_protein_g: nutrientActual(selectedActuals, "protein")?.target_amount
          ?? recommendationTargets?.target_protein_g
          ?? null,
        target_sodium_mg: nutrientActual(selectedActuals, "sodium")?.target_amount
          ?? recommendationTargets?.target_sodium_mg
          ?? null,
      };
  const hasAnalyzedDishes = residentId === DEMO_RESIDENT_ID
    ? selectedEntries.some((entry) => entry.dishes.length > 0)
    : (selectedActuals?.nutrients.length ?? 0) > 0;

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card"><LoaderCircle className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="sticky top-20 z-20 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
        <div>
          <h2 className="font-extrabold text-foreground">섭취 기록</h2>
          <p className="mt-1 text-xs text-muted-foreground">요약, 끼니별 기록과 실제 추정 영양 섭취량을 구분해 확인합니다.</p>
        </div>
        <div className="grid grid-cols-3 rounded-lg bg-muted p-1">
          {([
            ["history", "식사 기록"],
            ["nutrition", "영양 섭취"],
            ["summary", "이번 주"],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-2 text-xs font-bold transition-colors ${activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">{error}</div>
      ) : (
        <>
          {activeTab === "summary" && <div>
            <h3 className="mb-1 text-sm font-bold">이번 주 섭취 달성률</h3>
            <p className="mb-4 text-xs text-muted-foreground">월요일부터 일요일까지 식전·식후 이미지의 반찬별 잔반 분석을 기준으로 계산합니다.</p>
            <div className="grid grid-cols-7 gap-2">
            {recentSeven.map((date) => {
              const rate = dailyIntakeRate(date, entriesByDate[date] ?? [], registeredAt);
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
            <div className="mt-5 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold">이번 주 총 추정 영양 섭취량</h4>
                  <p className="mt-1 text-xs text-muted-foreground">잔반 분석이 완료된 식사 기록을 합산합니다.</p>
                </div>
                <Badge variant="outline">월~일 합계</Badge>
              </div>
              {hasRecentNutrition ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "열량", value: recentSevenNutrition.calorie, target: recentTargets.calorie, unit: "kcal" },
                    { label: "단백질", value: recentSevenNutrition.protein, target: recentTargets.protein, unit: "g" },
                    { label: "나트륨", value: recentSevenNutrition.sodium, target: recentTargets.sodium, unit: "mg" },
                  ].map((metric) => (
                    <NutritionMetricCard
                      key={metric.label}
                      {...metric}
                      targetAvailable={recentTargets.availableDays === recentSeven.length}
                      className="bg-muted/30 px-4 py-3"
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-muted px-3 py-5 text-center text-xs text-muted-foreground">이번 주에 계산할 수 있는 잔반 분석 결과가 없습니다.</p>
              )}
              {hasRecentNutrition && <p className="mt-3 text-[11px] text-muted-foreground">반찬 100g 영양정보에 판독된 섭취 비율을 적용한 추정 합계입니다.</p>}
            </div>
          </div>}

          {activeTab === "history" && <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">기간별 섭취 기록</h2>
                <div className="mt-2 flex gap-1.5 text-[11px]"><Badge variant="outline">완식</Badge><Badge variant="secondary">남김</Badge></div>
              </div>
              <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-muted/40 p-3">
                <CalendarDays className="mb-2 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <Label htmlFor="intakeStartDate" className="text-[11px]">시작일</Label>
                  <Input
                    id="intakeStartDate"
                    type="date"
                    value={startDate}
                    max={endDate}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setStartDate(event.target.value);
                      if (selectedDate < event.target.value) setSelectedDate(event.target.value);
                    }}
                    className="h-8 w-36 bg-background text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="intakeEndDate" className="text-[11px]">종료일</Label>
                  <Input
                    id="intakeEndDate"
                    type="date"
                    value={endDate}
                    min={startDate}
                    max={todayKey()}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setEndDate(event.target.value);
                      if (selectedDate > event.target.value) setSelectedDate(event.target.value);
                    }}
                    className="h-8 w-36 bg-background text-xs"
                  />
                </div>
                {[7, 14, 30].map((days) => (
                  <Button key={days} type="button" size="sm" variant="outline" onClick={() => selectRecentPeriod(days)}>
                    {days}일
                  </Button>
                ))}
                <Button type="button" size="sm" onClick={printIntakeReport}>
                  <Printer /> 분석 리포트 출력
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 md:grid-cols-14">
              {dates.map((date) => {
                const rate = dailyIntakeRate(date, entriesByDate[date] ?? [], registeredAt);
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
          </div>}

          {(activeTab === "history" || activeTab === "nutrition") && <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">{selectedDate.replaceAll("-", ". ")}</h3>
              {activeTab === "history" ? (
                <Badge variant={selectedRate === null ? "outline" : selectedRate >= 90 ? "default" : "secondary"}>
                  {selectedRate === null ? "기록 없음" : `평균 ${selectedRate}% 섭취`}
                </Badge>
              ) : (
                <Input
                  type="date"
                  aria-label="영양 섭취 조회 날짜"
                  value={selectedDate}
                  max={todayKey()}
                  onChange={(event) => {
                    if (!event.target.value) return;
                    setSelectedDate(event.target.value);
                    if (event.target.value < startDate) setStartDate(event.target.value);
                    if (event.target.value > endDate) setEndDate(event.target.value);
                  }}
                  className="h-8 w-36 text-xs"
                />
              )}
            </div>
            {activeTab === "history" && <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {MEAL_TYPES.map((mealType) => {
                  const entry = selectedEntries.find((item) => item.meal_type === mealType);
                  return (
                    <article key={mealType} className="rounded-xl bg-muted p-3">
                      <div className="flex justify-between">
                        <strong className="text-sm">{MEAL_LABEL[mealType]}</strong>
                        <span className="text-xs text-muted-foreground">
                          {!entry ? (selectedDateIsMissed ? "미섭취" : "기록 없음") : entry.completed ? "분석 완료" : entry.recorded ? entry.quick_check_status ?? "기록됨" : "분석 대기"}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {!entry || entry.dishes.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {!entry && selectedDateIsMissed ? "해당 끼니의 섭취 기록이 없어 미섭취로 집계했습니다." : "반찬별 분석 결과가 없습니다."}
                          </p>
                        ) : entry.dishes.map((dish) => (
                          <div key={`${entry.meal_id}-${dish.banchan_id}`} className="flex justify-between gap-2 text-xs"><span>{dish.banchan_name ?? "반찬명 미확인"}</span><span className="font-semibold">{Math.round(100 - dish.leftover_pct)}% 섭취</span></div>
                        ))}
                      </div>
                    </article>
                  );
                })}
            </div>}
            {activeTab === "nutrition" && <div className="mt-4 rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold">실제 추정 영양 섭취</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    반찬별 잔반 분석 결과를 하루 영양 목표와 비교한 참고값입니다.
                  </p>
                </div>
                <Badge variant="outline">{selectedDate}</Badge>
              </div>
              {!hasAnalyzedDishes ? (
                <p className="mt-4 rounded-lg bg-muted px-3 py-5 text-center text-xs text-muted-foreground">
                  이 날짜에는 영양 섭취량을 계산할 수 있는 잔반 분석 결과가 없습니다.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "열량", value: actualNutrition.calorie, target: targets?.target_calorie_kcal, unit: "kcal" },
                    { label: "단백질", value: actualNutrition.protein, target: targets?.target_protein_g, unit: "g" },
                    { label: "나트륨", value: actualNutrition.sodium, target: targets?.target_sodium_mg, unit: "mg" },
                  ].map((metric) => <NutritionMetricCard key={metric.label} {...metric} />)}
                </div>
              )}
              {hasAnalyzedDishes && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  반찬 100g 영양정보에 판독된 섭취 비율을 적용한 추정치이며 실제 제공량에 따라 달라질 수 있습니다.
                </p>
              )}
            </div>}
          </div>}
        </>
      )}
    </section>
  );
}
