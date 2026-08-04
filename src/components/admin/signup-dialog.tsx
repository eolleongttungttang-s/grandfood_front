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
import {
  getTestAdminAccounts,
  getTestSignupRequests,
  saveTestSignupRequests,
} from "@/lib/admin-auth";

type SignupDialogProps = {
  open: boolean;
  onClose: () => void;
};

type StoredFacility = {
  facilityId: number;
  facilityCode: string;
};

async function postSignupRequest(payload: Record<string, unknown>) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const response = await fetch(`${apiUrl}/api/signup/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(result?.detail ?? `API 요청에 실패했습니다. (${response.status})`);
  }

  return response.json().catch(() => null);
}

export function SignupDialog({ open, onClose }: SignupDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("signupPassword") ?? "");
    const passwordConfirm = String(form.get("passwordConfirm") ?? "");
    const account = String(form.get("signupAccount") ?? "").trim();

    if (!role) {
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

    const requests = getTestSignupRequests();
    const accountAlreadyExists =
      getTestAdminAccounts().some((item) => item.account === account) ||
      requests.some((item) => item.account === account);
    if (accountAlreadyExists) {
      setError("이미 사용 중이거나 승인 대기 중인 아이디입니다.");
      return;
    }

    const signupRequest = {
      id: Date.now(),
      name: String(form.get("name") ?? "").trim(),
      account,
      password,
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      facilityName: String(form.get("facilityName") ?? "").trim(),
      facilityCode: String(form.get("facilityCode") ?? "").trim(),
      workplaceName: String(form.get("workplaceName") ?? "").trim(),
      role,
      department: String(form.get("department") ?? "").trim(),
      requestedAt: new Intl.DateTimeFormat("ko-KR", {
        dateStyle: "medium",
      }).format(new Date()),
    };

    saveTestSignupRequests([...requests, signupRequest]);

    const savedFacilities = window.localStorage.getItem("grandfood_test_facilities");
    const facilities = savedFacilities
      ? (JSON.parse(savedFacilities) as StoredFacility[])
      : [];
    const facility = facilities.find(
      (item) => item.facilityCode === signupRequest.facilityCode,
    );

    try {
      await postSignupRequest({
        facility_id: facility?.facilityId ?? null,
        facility_code: signupRequest.facilityCode,
        workplace_name: signupRequest.workplaceName,
        name: signupRequest.name,
        role: signupRequest.role,
        department: signupRequest.department || null,
        account: signupRequest.account,
        email: signupRequest.email,
        phone: signupRequest.phone,
        password: signupRequest.password,
      });
      toast.success("회원가입 신청을 백엔드에 전송했습니다.");
    } catch (error) {
      toast.warning(
        `회원가입 신청은 로컬에 저장했습니다. ${
          error instanceof Error ? error.message : "백엔드 API에 연결하지 못했습니다."
        }`,
      );
    }
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
              <Label htmlFor="facilityName">관할 지자체</Label>
              <Input
                id="facilityName"
                name="facilityName"
                placeholder="예: 강남구청"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facilityCode">기관 코드</Label>
              <Input
                id="facilityCode"
                name="facilityCode"
                placeholder="발급받은 기관 코드"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workplaceName">근무 기관</Label>
              <Input
                id="workplaceName"
                name="workplaceName"
                placeholder="예: 강남종합사회복지관"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">담당 업무</Label>
              <Select value={role} onValueChange={(value) => setRole(value ?? "")}>
                <SelectTrigger id="role" className="h-9 w-full">
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
