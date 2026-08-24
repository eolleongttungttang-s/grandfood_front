"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ADMIN_SESSION_KEY, readAdminSession } from "@/lib/admin-auth";

const FALLBACK_SESSION_DURATION_SECONDS = 60 * 60;
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll"] as const;

function tokenExpiresAt(accessToken?: string) {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = JSON.parse(window.atob(padded)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function secondsUntil(expiresAt: number) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SessionTimer() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(FALLBACK_SESSION_DURATION_SECONDS);
  const expiredRef = useRef(false);

  useEffect(() => {
    const session = readAdminSession();
    const frontendExpiresAt = session?.frontendExpiresAt
      ?? Date.now() + FALLBACK_SESSION_DURATION_SECONDS * 1000;
    if (session && session.frontendExpiresAt === undefined) {
      window.sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ ...session, frontendExpiresAt }),
      );
    }
    const jwtExpiresAt = tokenExpiresAt(session?.accessToken);
    let expiresAt = jwtExpiresAt === null
      ? frontendExpiresAt
      : Math.min(jwtExpiresAt, frontendExpiresAt);
    let lastActivityResetAt = 0;

    const resetIdleTimeout = () => {
      const now = Date.now();
      if (now - lastActivityResetAt < 1000) return;
      lastActivityResetAt = now;
      const nextFrontendExpiresAt = now + FALLBACK_SESSION_DURATION_SECONDS * 1000;
      expiresAt = jwtExpiresAt === null
        ? nextFrontendExpiresAt
        : Math.min(jwtExpiresAt, nextFrontendExpiresAt);
      setSecondsLeft(secondsUntil(expiresAt));
      const currentSession = readAdminSession();
      if (currentSession) {
        window.sessionStorage.setItem(
          ADMIN_SESSION_KEY,
          JSON.stringify({ ...currentSession, frontendExpiresAt: expiresAt }),
        );
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimeout, { passive: true });
    });
    const interval = setInterval(() => {
      setSecondsLeft(secondsUntil(expiresAt));
    }, 1000);
    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimeout);
      });
    };
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !expiredRef.current) {
      expiredRef.current = true;
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      toast.error("세션이 만료되어 자동 로그아웃됐어요. 다시 로그인해 주세요.");
      router.replace("/admin/login");
    }
  }, [secondsLeft, router]);

  const isWarning = secondsLeft <= 60;

  return (
    <span className={isWarning ? "font-semibold text-destructive" : undefined}>
      세션 만료까지 {formatTime(secondsLeft)}
    </span>
  );
}
