"use client";

import Image from "next/image";
import { CheckCircle2, ImagePlus, LoaderCircle, Sparkles, Trash2, Upload } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

type MealImage = {
  file: File;
  previewUrl: string;
};

type DishAnalysis = {
  name: string;
  consumedPercent: number;
  description: string;
};

const DEMO_ANALYSIS: DishAnalysis[] = [
  { name: "잡곡밥", consumedPercent: 85, description: "대부분 섭취했습니다." },
  { name: "된장국", consumedPercent: 70, description: "절반 이상 섭취했습니다." },
  { name: "제육볶음", consumedPercent: 90, description: "거의 모두 섭취했습니다." },
  { name: "시금치나물", consumedPercent: 60, description: "절반 정도 섭취했습니다." },
];

type ImageSlotProps = {
  badge: string;
  description: string;
  image: MealImage | null;
  inputId: string;
  onChange: (file: File) => void;
  onRemove: () => void;
  title: string;
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

function ImageSlot({
  badge,
  description,
  image,
  inputId,
  onChange,
  onRemove,
  title,
}: ImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("이미지는 10MB 이하로 올려주세요.");
      return;
    }
    onChange(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndChange(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    validateAndChange(event.dataTransfer.files?.[0]);
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
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
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
          className={`flex aspect-[16/9] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors ${
            isDragging
              ? "border-foreground bg-muted"
              : "border-border bg-muted/35 hover:border-muted-foreground/50 hover:bg-muted/70"
          }`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div className="mb-3 rounded-full border border-border bg-card p-3 shadow-sm">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-sm font-bold text-foreground">클릭하거나 사진을 끌어 놓으세요</span>
          <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP · 최대 10MB</span>
        </div>
      )}
    </div>
  );
}

export function MealImageUpload({
  disabled = false,
  residentId,
  residentName,
}: {
  disabled?: boolean;
  residentId: string;
  residentName: string;
}) {
  const [beforeImage, setBeforeImage] = useState<MealImage | null>(null);
  const [afterImage, setAfterImage] = useState<MealImage | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DishAnalysis[] | null>(null);
  const [mealSlot, setMealSlot] = useState("");

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

  const analyzeImages = async () => {
    if (disabled) {
      toast.error("화면에서 임시 등록한 대상자는 서버 등록 후 사진을 업로드할 수 있습니다.");
      return;
    }
    if (
      !beforeImage ||
      !afterImage ||
      !mealSlot ||
      isAnalyzing
    )
      return;

    setAnalysisResult(null);
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("mealSlot", mealSlot);
      formData.append(
        "comboId",
        `AUTO-${new Date().toISOString().slice(0, 10)}-${mealSlot}`,
      );
      formData.append("beforePhoto", beforeImage.file);
      formData.append("afterPhoto", afterImage.file);
      const accessToken = readAdminSession()?.accessToken;
      const response = await fetch(
        `${getApiUrl()}/wards/${encodeURIComponent(residentId)}/meal-logs`,
        {
          method: "POST",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          body: formData,
        },
      );
      const result = (await response.json().catch(() => null)) as
        | { detail?: unknown }
        | null;
      if (!response.ok) {
        throw new Error(extractErrorMessage(result?.detail, "이미지를 저장하지 못했습니다."));
      }

      await new Promise((resolve) => window.setTimeout(resolve, 1800));
      setAnalysisResult(DEMO_ANALYSIS);
      toast.success("이미지 저장과 잔반 분석이 완료됐어요.");
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
          disabled={!canAnalyze || isAnalyzing}
          onClick={analyzeImages}
        >
          <Sparkles className="h-4 w-4" />
          {isAnalyzing ? "AI 분석 중..." : "잔반 분석 시작"}
        </Button>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-muted/25 p-4">
        <div className="space-y-2">
          <Label htmlFor="meal-slot">식사 구분</Label>
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
        />
        <ImageSlot
          badge="AFTER"
          title="식사 후 사진"
          description="식사가 끝난 뒤, 남은 음식 전체가 보이도록 촬영해 주세요."
          image={afterImage}
          inputId="meal-after-image"
          onChange={(file) => replaceImage(file, setAfterImage)}
          onRemove={() => setAfterImage(null)}
        />
      </div>

      {(isAnalyzing || analysisResult) && (
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
                <span className="rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">
                  평균 {Math.round(analysisResult.reduce((sum, dish) => sum + dish.consumedPercent, 0) / analysisResult.length)}% 섭취
                </span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {analysisResult.map((dish) => (
                  <div key={dish.name} className="rounded-lg border border-border p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="font-bold text-foreground">{dish.name}</span>
                      <span className="text-sm font-extrabold text-foreground">{dish.consumedPercent}%</span>
                    </div>
                    <Progress value={dish.consumedPercent} />
                    <p className="mt-2 text-xs text-muted-foreground">{dish.description}</p>
                  </div>
                ))}
              </div>
              <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                현재 결과는 화면 확인을 위한 시연 데이터이며, AI 분석 API 연결 후 실제 결과로 교체됩니다.
              </p>
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
