"use client";

import Image from "next/image";
import { ImagePlus, Sparkles, Trash2, Upload } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { readAdminSession } from "@/lib/admin-auth";

type MealImage = {
  file: File;
  previewUrl: string;
};

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
  residentId,
  residentName,
}: {
  residentId: string;
  residentName: string;
}) {
  const [beforeImage, setBeforeImage] = useState<MealImage | null>(null);
  const [afterImage, setAfterImage] = useState<MealImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mealSlot, setMealSlot] = useState("");
  const [comboId, setComboId] = useState("");

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

  const canAnalyze = Boolean(
    beforeImage && afterImage && mealSlot && comboId.trim(),
  );

  const uploadImages = async () => {
    if (
      !beforeImage ||
      !afterImage ||
      !mealSlot ||
      !comboId.trim() ||
      isUploading
    )
      return;

    const formData = new FormData();
    formData.append("mealSlot", mealSlot);
    formData.append("comboId", comboId.trim());
    formData.append("beforePhoto", beforeImage.file);
    formData.append("afterPhoto", afterImage.file);
    setIsUploading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const accessToken = readAdminSession()?.accessToken;
      const response = await fetch(
        `${apiUrl}/wards/${encodeURIComponent(residentId)}/meal-logs`,
        {
          method: "POST",
          headers: accessToken
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined,
          body: formData,
        },
      );

      const result = (await response.json().catch(() => null)) as
        | { detail?: string; meal_id?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.detail ?? "이미지를 저장하지 못했습니다.");
      }

      toast.success("식사 전·후 이미지가 스토리지에 저장됐어요.");
      setBeforeImage(null);
      setAfterImage(null);
      setMealSlot("");
      setComboId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다.",
      );
    } finally {
      setIsUploading(false);
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
          disabled={!canAnalyze || isUploading}
          onClick={uploadImages}
        >
          <Sparkles className="h-4 w-4" />
          {isUploading ? "스토리지에 저장 중..." : "잔반 분석 시작"}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 rounded-xl border border-border bg-muted/25 p-4 sm:grid-cols-2">
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
        <div className="space-y-2">
          <Label htmlFor="combo-id">반찬 조합 ID</Label>
          <Input
            id="combo-id"
            value={comboId}
            onChange={(event) => setComboId(event.target.value)}
            placeholder="예: COMBO-0001"
          />
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

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <span
          className={`h-2 w-2 rounded-full ${canAnalyze ? "bg-risk-normal-foreground" : "bg-muted-foreground/40"}`}
        />
        {isUploading
          ? "식사 전·후 이미지를 안전하게 저장하고 있어요."
          : canAnalyze
          ? "필수 정보와 두 장의 사진이 준비됐습니다. 잔반 분석을 시작할 수 있어요."
          : "식사 구분, 반찬 조합 ID와 식사 전·후 사진을 모두 입력해 주세요."}
      </div>
    </section>
  );
}
