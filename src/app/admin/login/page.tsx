"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPinCheck, ShieldCheck, TimerReset } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const OTP_LENGTH = 6;

export default function AdminLoginPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("담당자 계정과 비밀번호를 입력해 주세요.");
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      setError("OTP 6자리를 모두 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      toast.success("인증되었습니다. 대상자 명단으로 이동할게요.");
      router.push("/admin/residents");
    }, 700);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <Card className="w-full max-w-[440px] shadow-lg">
        <CardHeader className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-foreground">
              GrandFood
            </span>
            <Badge variant="outline" className="border-accent text-accent">
              GOV ADMIN
            </Badge>
          </div>
          <CardTitle className="text-xl">안녕하세요, 담당자님</CardTitle>
          <CardDescription className="text-balance">
            어르신들의 건강 정보를 안전하게 지키기 위해 두 단계로 확인할게요.
            불편을 드려 죄송하지만, 잠깐이면 끝나요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orgCode">기관 코드</Label>
              <Input id="orgCode" name="orgCode" defaultValue="SEOUL-GN-0142" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">담당자 계정</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jhpark@gangnam.go.kr"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="otp">2차 인증 · OTP 6자리</Label>
              <Input
                id="otp"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))
                }
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                placeholder="······"
                className="h-12 text-center text-lg font-bold tracking-[0.6em]"
              />
              <p className="text-xs text-muted-foreground">
                문자로 보내드린 인증번호 6자리를 입력해 주세요.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" disabled={submitting} className="mt-1">
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "인증하는 중..." : "인증하고 들어가기"}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-2.5 rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPinCheck className="h-3.5 w-3.5 text-chart-3" />
              <span>허용된 기관 IP에서 접속 중이에요 · 210.94.xx.xx</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-chart-3" />
              <span>기관 발급 인증서(GPKI)가 확인됐어요</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TimerReset className="h-3.5 w-3.5 text-accent" />
              <span>세션은 30분 뒤 자동으로 종료돼요</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
