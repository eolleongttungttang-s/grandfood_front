"use client";

import Image from "next/image";
import { CheckCircle2, ImagePlus, LoaderCircle, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readAdminSession } from "@/lib/admin-auth";
import { extractErrorMessage, getApiUrl } from "@/lib/api";
import {
  fetchMonthlyRecommendation,
  type FacilityMealType,
  type MonthlyRecommendation,
} from "@/lib/admin-monthly-recommendation-api";
import { recommendationForDate } from "@/lib/admin-recommendation-date";

type MealImage = {
  file: File;
  previewUrl: string;
};

type DishAnalysis = {
  name: string;
  consumedPercent: number | null;
  description: string;
};

type NutritionGapItem = {
  nutrient_type: "calorie" | "protein" | "sodium" | "carbs";
  average_amount: number;
  average_target_amount: number;
  fulfillment_pct: number | null;
  deficient: boolean;
};

type NutritionGapsResponse = {
  elder_id: string;
  period_days: number;
  items: NutritionGapItem[];
};

const NUTRIENT_LABELS: Record<NutritionGapItem["nutrient_type"], { label: string; unit: string }> = {
  calorie: { label: "열량", unit: "kcal" },
  protein: { label: "단백질", unit: "g" },
  sodium: { label: "나트륨", unit: "mg" },
  carbs: { label: "탄수화물", unit: "g" },
};

type DietHistoryResponse = {
  items?: Array<{
    meal_id: string;
    dishes?: Array<{
      banchan_id: string;
      banchan_name: string | null;
      leftover_pct: number;
    }>;
  }>;
};

const ANALYSIS_POLL_INTERVAL_MS = 4_000;
const ANALYSIS_POLL_MAX_ATTEMPTS = 8;

function getCurrentMealSlot() {
  const hour = new Date().getHours();
  if (hour < 11) return "아침";
  if (hour < 17) return "점심";
  return "저녁";
}

const MEAL_SLOT_TYPE: Record<string, FacilityMealType> = {
  아침: "breakfast",
  점심: "lunch",
  저녁: "dinner",
};

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function localMonthKey(date = new Date()) {
  return localDateKey(date).slice(0, 7);
}

function intakeDescription(percent: number) {
  if (percent >= 90) return "거의 모두 섭취했습니다.";
  if (percent >= 70) return "대부분 섭취했습니다.";
  if (percent >= 50) return "절반 이상 섭취했습니다.";
  if (percent > 0) return "섭취량이 절반보다 적습니다.";
  return "섭취하지 않았습니다.";
}

function normalizeMenuName(name: string) {
  return name.replace(/\s+/g, "").toLowerCase();
}

function includeUnmeasuredMenuItems(detected: DishAnalysis[], menuNames: string[]) {
  const detectedNames = new Set(detected.map((dish) => normalizeMenuName(dish.name)));
  const unmeasured = menuNames
    .filter((name) => !detectedNames.has(normalizeMenuName(name)))
    .map((name): DishAnalysis => ({
      name,
      consumedPercent: null,
      description: "메뉴에는 포함되어 있지만 사진에서 섭취량을 판독하지 못했습니다.",
    }));
  return [...detected, ...unmeasured];
}

type ImageSlotProps = {
  badge: string;
  description: string;
  image: MealImage | null;
  inputId: string;
  onChange: (file: File) => void;
  onRemove: () => void;
  title: string;
  uploadDisabled?: boolean;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function isHeicImage(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
}

async function convertHeicToJpeg(file: File) {
  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "meal-photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
}

function ImageSlot({
  badge,
  description,
  image,
  inputId,
  onChange,
  onRemove,
  title,
  uploadDisabled = false,
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndChange = async (file?: File) => {
    if (uploadDisabled) return;
    if (!file) return;
    if (!file.type.startsWith("image/") && !isHeicImage(file)) {
      toast.error("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("이미지는 10MB 이하로 올려주세요.");
      return;
    }
    if (!isHeicImage(file)) {
      onChange(file);
      return;
    }
    try {
      const jpeg = await convertHeicToJpeg(file);
      if (jpeg.size > MAX_IMAGE_SIZE) {
        toast.error("JPG 변환 후 이미지가 10MB를 초과했습니다.");
        return;
      }
      onChange(jpeg);
      toast.success("아이폰 사진을 JPG로 변환했습니다.");
    } catch {
      toast.error("아이폰 사진을 JPG로 변환하지 못했습니다. 기기에서 JPG로 저장한 뒤 다시 시도해 주세요.");
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void validateAndChange(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (uploadDisabled) return;
    void validateAndChange(event.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background">
              {badge}
            </span>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        {image && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${title} 삭제`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={handleInputChange}
        disabled={uploadDisabled}
      />

      {image ? (
        <div className="group relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={image.previewUrl}
            alt={`${title} 미리보기`}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-8">
            <span className="min-w-0 truncate text-xs font-medium text-white">
              {image.file.name}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              사진 교체
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={`${title} 업로드`}
          className={`flex aspect-[16/9] flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors ${uploadDisabled ? "cursor-not-allowed opacity-65" : "cursor-pointer"} ${
            isDragging
              ? "border-foreground bg-muted"
              : "border-border bg-muted/35 hover:border-muted-foreground/50 hover:bg-muted/70"
          }`}
          onClick={() => {
            if (!uploadDisabled) inputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              if (!uploadDisabled) inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!uploadDisabled) setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="mb-3 rounded-full border border-border bg-card p-3 shadow-sm">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">{uploadDisabled ? "예시 대상자는 사진 업로드가 비활성화되어 있습니다" : "클릭하거나 사진을 끌어 놓으세요"}</span>
          <span className="mt-1 text-xs text-muted-foreground">{uploadDisabled ? "실제 대상자에서 이미지 분석을 이용할 수 있습니다." : "JPG, PNG, WEBP, HEIC · 최대 10MB"}</span>
        </div>
      )}
    </div>
  );
}

export function MealImageUpload({
  residentId,
  residentName,
  uploadDisabled = false,
}: {
  residentId: string;
  residentName: string;
  uploadDisabled?: boolean;
}) {
  const [beforeImage, setBeforeImage] = useState<MealImage | null>(null);
  const [afterImage, setAfterImage] = useState<MealImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DishAnalysis[] | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionGapItem[] | null>(null);
  const [pendingAnalysisMealId, setPendingAnalysisMealId] = useState<string | null>(null);
  const [analysisTimedOut, setAnalysisTimedOut] = useState(false);
  const [mealSlot, setMealSlot] = useState(getCurrentMealSlot);
  const [todayRecommendation, setTodayRecommendation] = useState<MonthlyRecommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMonthlyRecommendation(residentId, localMonthKey())
      .then((result) => { if (!cancelled) setTodayRecommendation(result); })
      .catch(() => { if (!cancelled) setTodayRecommendation(null); })
      .finally(() => { if (!cancelled) setRecommendationLoading(false); });
    return () => { cancelled = true; };
  }, [residentId]);

  useEffect(() => {
    const previewUrl = beforeImage?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [beforeImage?.previewUrl]);

  useEffect(() => {
    const previewUrl = afterImage?.previewUrl;
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [afterImage?.previewUrl]);

  const replaceImage = (
    file: File,
    setter: (image: MealImage | null) => void,
  ) => {
    setter({ file, previewUrl: URL.createObjectURL(file) });
  };

  const canAnalyze = Boolean(beforeImage && afterImage && mealSlot);
  const todayKey = localDateKey();
  const selectedMealType = MEAL_SLOT_TYPE[mealSlot];
  const selectedRecommendationMeal = todayRecommendation?.days
    ?.find((day) => day.service_date === todayKey)
    ?.meals.find((meal) => meal.meal_type === selectedMealType) ?? null;
  const selectedMenuNames = [
    ...(selectedRecommendationMeal?.staple ? [selectedRecommendationMeal.staple.name] : []),
    ...(selectedRecommendationMeal?.items.map((item) => item.name) ?? []),
  ];
  const recommendationId = recommendationForDate(todayRecommendation, todayKey)?.id ?? null;

  const fetchAnalysisResult = async (mealId: string, accessToken: string) => {
    for (let attempt = 0; attempt < ANALYSIS_POLL_MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, ANALYSIS_POLL_INTERVAL_MS));
      const response = await fetch(
        `${getApiUrl()}/app/elder/${encodeURIComponent(residentId)}/diet-history?days=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const result = (await response.json().catch(() => null)) as
        | DietHistoryResponse
        | { detail?: unknown }
        | null;
      if (!response.ok) {
        const fallback = response.status === 403
          ? "담당자 계정의 잔반 분석 결과 조회 권한이 아직 백엔드에 연결되지 않았습니다."
          : "잔반 분석 결과를 조회하지 못했습니다.";
        throw new Error(extractErrorMessage((result as { detail?: unknown } | null)?.detail, fallback));
      }
      const match = (result as DietHistoryResponse | null)?.items?.find(
        (item) => item.meal_id === mealId,
      );
      if (match?.dishes?.length) {
        const detected = match.dishes.map((dish) => {
          const consumedPercent = Math.max(0, Math.min(100, Math.round(100 - dish.leftover_pct)));
          return {
            name: dish.banchan_name ?? "반찬",
            consumedPercent,
            description: intakeDescription(consumedPercent),
          };
        });
        return includeUnmeasuredMenuItems(detected, selectedMenuNames);
      }
    }
    return null;
  };

  const fetchNutritionSummary = async (accessToken: string) => {
    const response = await fetch(
      `${getApiUrl()}/app/elder/${encodeURIComponent(residentId)}/nutrition-gaps?days=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) return null;
    const result = (await response.json()) as NutritionGapsResponse;
    return result.items;
  };

  const checkPendingAnalysis = async () => {
    if (!pendingAnalysisMealId || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisTimedOut(false);
    try {
      const accessToken = readAdminSession()?.accessToken;
      if (!accessToken) {
        throw new Error("관리자 로그인 토큰이 없습니다. 로그아웃 후 다시 로그인해 주세요.");
      }
      const result = await fetchAnalysisResult(
        pendingAnalysisMealId,
        accessToken,
      );
      if (result) {
        setAnalysisResult(result);
        setNutritionSummary(await fetchNutritionSummary(accessToken));
        setPendingAnalysisMealId(null);
        toast.success("GPU 잔반 분석이 완료됐어요.");
      } else {
        setAnalysisTimedOut(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "분석 결과를 조회하지 못했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeImages = async () => {
    if (
      !beforeImage ||
      !afterImage ||
      !mealSlot ||
      isAnalyzing
    )
      return;

    setAnalysisResult(null);
    setNutritionSummary(null);
    setPendingAnalysisMealId(null);
    setAnalysisTimedOut(false);
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("mealSlot", mealSlot);
      formData.append(
        "comboId",
        recommendationId ?? `AUTO-${todayKey}-${mealSlot}`,
      );
      formData.append("beforePhoto", beforeImage.file);
      formData.append("afterPhoto", afterImage.file);
      const accessToken = readAdminSession()?.accessToken;
      if (!accessToken) {
        throw new Error("관리자 로그인 토큰이 없습니다. 로그아웃 후 다시 로그인해 주세요.");
      }
      const response = await fetch(
        `${getApiUrl()}/wards/${encodeURIComponent(residentId)}/meal-logs`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { id?: string; detail?: unknown }
        | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(result?.detail, "이미지를 저장하지 못했습니다."));
      }

      if (!result?.id) {
        throw new Error("이미지는 저장됐지만 분석할 식사 ID를 받지 못했습니다.");
      }
      setPendingAnalysisMealId(result.id);
      window.dispatchEvent(new CustomEvent("grandfood:meal-log-updated", {
        detail: { residentId },
      }));
      const analysis = await fetchAnalysisResult(result.id, accessToken);
      if (analysis) {
        setAnalysisResult(analysis);
        setNutritionSummary(await fetchNutritionSummary(accessToken));
        setPendingAnalysisMealId(null);
        window.dispatchEvent(new CustomEvent("grandfood:meal-log-updated", {
          detail: { residentId },
        }));
        toast.success("이미지 저장과 GPU 잔반 분석이 완료됐어요.");
      } else {
        setAnalysisTimedOut(true);
        toast.success("이미지는 저장됐습니다. GPU 분석 결과는 잠시 후 다시 확인해 주세요.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "잔반 분석 중 오류가 발생했습니다.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-foreground" />
            <h2 className="text-base font-extrabold text-foreground">오늘의 잔반 이미지</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {residentName}님의 식사 전·후 사진을 같은 각도에서 촬영해 등록해 주세요.
          </p>
        </div>
        <Button
          type="button"
          disabled={uploadDisabled || !canAnalyze || isAnalyzing}
          onClick={analyzeImages}
        >
          <Sparkles className="h-4 w-4" />
          {isAnalyzing ? "AI 분석 중..." : "잔반 분석 시작"}
        </Button>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-muted/25 p-4">
        <div className="space-y-2">
          <Label htmlFor="meal-slot">식사 구분 <span className="font-normal text-muted-foreground">(현재 시간 기준 자동 선택)</span></Label>
          <Select value={mealSlot} onValueChange={(value) => setMealSlot(value ?? "")}>
            <SelectTrigger id="meal-slot" className="w-full">
              <SelectValue placeholder="아침·점심·저녁 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="아침">아침</SelectItem>
              <SelectItem value="점심">점심</SelectItem>
              <SelectItem value="저녁">저녁</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-lg border border-border bg-background px-3 py-2.5">
            <p className="text-xs font-semibold text-muted-foreground">{todayKey} {mealSlot} 분석 기준 식단</p>
            {recommendationLoading ? (
              <p className="mt-1 text-sm text-muted-foreground">추천 식단을 확인하는 중입니다.</p>
            ) : selectedMenuNames.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedMenuNames.map((name) => <Badge key={name} variant="secondary">{name}</Badge>)}
              </div>
            ) : (
              <p className="mt-1 text-sm text-amber-700">이 날짜와 끼니에 저장된 추천 식단이 없습니다. GPU는 일반 분석으로 진행됩니다.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <ImageSlot
          badge="BEFORE"
          title="식사 전 사진"
          description="배식 직후, 음식 전체가 잘 보이도록 촬영해 주세요."
          image={beforeImage}
          inputId="meal-before-image"
          onChange={(file) => replaceImage(file, setBeforeImage)}
          onRemove={() => setBeforeImage(null)}
          uploadDisabled={uploadDisabled}
        />
        <ImageSlot
          badge="AFTER"
          title="식사 후 사진"
          description="식사가 끝난 뒤, 남은 음식 전체가 보이도록 촬영해 주세요."
          image={afterImage}
          inputId="meal-after-image"
          onChange={(file) => replaceImage(file, setAfterImage)}
          onRemove={() => setAfterImage(null)}
          uploadDisabled={uploadDisabled}
        />
      </div>

      {(isAnalyzing || analysisResult || analysisTimedOut) && (
        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-background">
          {isAnalyzing ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
              <div className="rounded-full bg-muted p-4">
                <LoaderCircle className="h-7 w-7 animate-spin text-foreground" />
              </div>
              <div>
                <h3 className="font-extrabold text-foreground">AI가 잔반을 분석하고 있어요</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  식사 전·후 사진을 비교해 반찬별 섭취량을 계산하는 중입니다.
                </p>
              </div>
            </div>
          ) : analysisResult ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/35 px-5 py-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-risk-normal-foreground" />
                  <div>
                    <h3 className="font-extrabold text-foreground">AI 잔반 분석 결과</h3>
                    <p className="text-xs text-muted-foreground">반찬별 예상 섭취 비율입니다.</p>
                  </div>
                </div>
                {(() => {
                  const measured = analysisResult.filter((dish): dish is DishAnalysis & { consumedPercent: number } => dish.consumedPercent !== null);
                  return measured.length > 0 ? <span className="rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">평균 {Math.round(measured.reduce((sum, dish) => sum + dish.consumedPercent, 0) / measured.length)}% 섭취</span> : <Badge variant="outline">판독 결과 없음</Badge>;
                })()}
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {analysisResult.map((dish) => (
                  <div key={dish.name} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="font-bold text-foreground">{dish.name}</span>
                      <span className="text-sm font-extrabold text-foreground">{dish.consumedPercent === null ? "분석 불가" : `${dish.consumedPercent}%`}</span>
                    </div>
                    <Progress value={dish.consumedPercent ?? 0} />
                    <p className="mt-2 text-xs text-muted-foreground">{dish.description}</p>
                  </div>
                ))}
              </div>
              {nutritionSummary && nutritionSummary.length > 0 && (
                <div className="border-t border-border p-5">
                  <div><h4 className="font-extrabold text-foreground">오늘 누적 예상 영양 섭취</h4><p className="mt-0.5 text-xs text-muted-foreground">잔반 분석 결과와 반찬별 100g 영양정보를 기준으로 계산한 참고값입니다.</p></div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {nutritionSummary.map((item) => {
                      const meta = NUTRIENT_LABELS[item.nutrient_type];
                      const rate = item.fulfillment_pct == null ? null : Math.round(item.fulfillment_pct);
                      return <div key={item.nutrient_type} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between text-xs"><span className="font-semibold text-muted-foreground">{meta.label}</span><Badge variant={item.deficient ? "destructive" : "secondary"}>{rate == null ? "-" : `${rate}%`}</Badge></div><p className="mt-1 text-base font-extrabold">{Math.round(item.average_amount).toLocaleString()}{meta.unit}<span className="ml-1 text-xs font-medium text-muted-foreground">/ {Math.round(item.average_target_amount).toLocaleString()}{meta.unit}</span></p><Progress className="mt-2" value={Math.min(rate ?? 0, 100)} /></div>;
                    })}
                  </div>
                </div>
              )}
              <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                업로드한 식전·식후 사진을 GPU 추론 서버에서 분석한 결과입니다.
              </p>
            </div>
          ) : analysisTimedOut ? (
            <div className="flex min-h-44 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
              <div><h3 className="font-extrabold text-foreground">분석에 시간이 걸리고 있어요</h3><p className="mt-1 text-sm text-muted-foreground">이미지는 정상 저장됐습니다. 잠시 후 같은 식사 기록의 결과를 다시 확인해 주세요.</p></div>
              <Button type="button" variant="outline" onClick={() => void checkPendingAnalysis()} disabled={!pendingAnalysisMealId}><RefreshCw />분석 결과 다시 확인</Button>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <span
          className={`h-2 w-2 rounded-full ${canAnalyze ? "bg-risk-normal-foreground" : "bg-muted-foreground/40"}`}
        />
        {isAnalyzing
          ? "AI가 반찬 종류와 섭취량을 분석하고 있어요."
          : canAnalyze
          ? "필수 정보와 두 장의 사진이 준비됐습니다. 잔반 분석을 시작할 수 있어요."
          : "식사 구분과 식사 전·후 사진을 모두 입력해 주세요."}
      </div>
    </section>
  );
}
