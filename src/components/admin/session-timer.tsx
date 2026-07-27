"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Matches the "세션은 30분 뒤 자동 종료돼요" notice shown on the login screen.
const SESSION_DURATION_SECONDS = 30 * 60;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll"] as const;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SessionTimer() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION_SECONDS);
  const expiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function resetTimer() {
      setSecondsLeft(SESSION_DURATION_SECONDS);
    }
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer));
    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !expiredRef.current) {
      expiredRef.current = true;
      toast.error("세션이 만료되어 자동 로그아웃됐어요. 다시 로그인해 주세요.");
      router.push("/admin/login");
    }
  }, [secondsLeft, router]);

  const isWarning = secondsLeft <= 60;

  return (
    <span className={isWarning ? "font-semibold text-destructive" : undefined}>
      세션 만료까지 {formatTime(secondsLeft)}
    </span>
  );
}
