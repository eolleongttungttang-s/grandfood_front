"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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

type SignupDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function SignupDialog({ open, onClose }: SignupDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [jobRole, setJobRole] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("signupPassword") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");

    if (!jobRole) {
      setError("담당 업무를 선택해 주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상으로 입력해 주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    toast.success("가입 신청 화면 확인이 완료되었습니다. 저장 기능은 추후 연결됩니다.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-title"
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div>
            <h2 id="signup-title" className="text-xl font-bold text-slate-900">
              회원가입
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              가입 신청 후 관할 지자체 관리자의 승인이 필요합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="회원가입 창 닫기"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-7 px-6 py-6 sm:px-8">
          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="mb-4 text-base font-bold text-slate-800">
              소속 정보
            </legend>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">관할 지자체</Label>
              <Input
                id="jurisdiction"
                name="jurisdiction"
                placeholder="예: 강남구청"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationCode">기관 코드</Label>
              <Input
                id="organizationCode"
                name="organizationCode"
                placeholder="발급받은 기관 코드"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workplace">근무 기관</Label>
              <Input
                id="workplace"
                name="workplace"
                placeholder="예: 강남종합사회복지관"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobRole">담당 업무</Label>
              <Select value={jobRole} onValueChange={(value) => setJobRole(value ?? "")}>
                <SelectTrigger id="jobRole" className="h-9 w-full">
                  <SelectValue placeholder="담당 업무 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="담당 공무원">담당 공무원</SelectItem>
                  <SelectItem value="영양사">영양사</SelectItem>
                  <SelectItem value="사회복지사">사회복지사</SelectItem>
                  <SelectItem value="기타 담당자">기타 담당자</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                선택한 업무는 관리자 승인 시 확인됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">부서·팀 (선택)</Label>
              <Input
                id="department"
                name="department"
                placeholder="예: 복지정책과, 사례관리팀"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" name="name" placeholder="이름 입력" required />
            </div>
          </fieldset>

          <div className="h-px bg-slate-200" />

          <fieldset className="grid gap-5 sm:grid-cols-2">
            <legend className="mb-4 text-base font-bold text-slate-800">
              계정 정보
            </legend>
            <div className="space-y-2">
              <Label htmlFor="signupAccount">아이디</Label>
              <Input
                id="signupAccount"
                name="signupAccount"
                autoComplete="username"
                placeholder="사용할 아이디"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">업무용 이메일</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.go.kr"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signupPassword">비밀번호</Label>
              <Input
                id="signupPassword"
                name="signupPassword"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상 입력"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                placeholder="비밀번호 다시 입력"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                placeholder="010-0000-0000"
                required
              />
            </div>
          </fieldset>

          <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <input
              type="checkbox"
              name="privacyAgreement"
              required
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              회원가입 신청과 소속 확인을 위한 개인정보 수집·이용에
              동의합니다.
            </span>
          </label>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">가입 신청</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
