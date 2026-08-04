"use client";

import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { GrandFoodLogo } from "@/components/brand/grandfood-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignupDialog } from "@/components/admin/signup-dialog";
import {
  ADMIN_SESSION_KEY,
  authenticateTestAdmin,
  createAdminSession,
} from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const account = String(form.get("account") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!account || !password) {
      setError("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }

    const authenticatedAccount = authenticateTestAdmin(account, password);
    if (!authenticatedAccount) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    window.sessionStorage.setItem(
      ADMIN_SESSION_KEY,
      createAdminSession(authenticatedAccount),
    );
    toast.success(`${authenticatedAccount.name ?? account} 계정으로 로그인했습니다.`);
    router.push(
      authenticatedAccount.accessLevel === "SUPER_ADMIN"
        ? "/admin/dashboard"
        : "/admin/residents",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5 py-12">
      <section className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <div className="mb-8">
              <GrandFoodLogo
                className="mb-8"
                markClassName="h-9 w-9"
                wordmarkClassName="text-lg font-extrabold text-slate-900"
              />
              <p className="text-sm font-semibold text-primary">관리자 로그인</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                담당자 계정으로 로그인
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="account">아이디</Label>
                <Input
                  id="account"
                  name="account"
                  autoComplete="username"
                  placeholder="아이디 입력"
                  className="h-12 bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="비밀번호 입력"
                  className="h-12 bg-white"
                />
              </div>

              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" size="lg" className="h-12 w-full text-base">
                로그인
              </Button>
            </form>

            <nav
              aria-label="계정 도움말"
              className="mt-5 flex items-center justify-center text-sm text-slate-500"
            >
              {["아이디 찾기", "비밀번호 찾기", "회원가입"].map(
                (label, index) => (
                  <span key={label} className="flex items-center">
                    {index > 0 && (
                      <span
                        aria-hidden="true"
                        className="mx-3 h-3 w-px bg-slate-300"
                      />
                    )}
                    <button
                      type="button"
                      className="font-medium underline-offset-4 hover:text-primary hover:underline"
                      onClick={() => {
                        if (label === "회원가입") {
                          setSignupOpen(true);
                          return;
                        }
                        toast.info(`${label} 기능은 추후 연결됩니다.`);
                      }}
                    >
                      {label}
                    </button>
                  </span>
                ),
              )}
            </nav>

            <div className="mt-7 flex items-start gap-2 border-t border-slate-200 pt-5 text-sm text-slate-500">
              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                계정 발급 또는 로그인에 문제가 있으면 소속 기관의 시스템
                관리자에게 문의해 주세요.
              </p>
            </div>
          </div>
      </section>
      <SignupDialog open={signupOpen} onClose={() => setSignupOpen(false)} />
    </main>
  );
}
