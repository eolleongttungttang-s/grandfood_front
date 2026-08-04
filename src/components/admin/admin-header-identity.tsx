"use client";

import { useEffect, useState } from "react";

import { SessionTimer } from "@/components/admin/session-timer";
import { AdminSession, readAdminSession } from "@/lib/admin-auth";

export function AdminHeaderIdentity() {
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSession(readAdminSession()), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const isSuperAdmin = session?.accessLevel === "SUPER_ADMIN";

  return (
    <>
      <span className="text-sm font-semibold text-foreground">
        {isSuperAdmin
          ? "GrandFood · 서비스 관리"
          : `${session?.facilityName ?? "지자체"} · ${
              session?.role ?? "담당자"
            }`}
      </span>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <SessionTimer />
        <span className="text-foreground">
          {session?.account ?? "관리자"}님, 안녕하세요
        </span>
      </div>
    </>
  );
}
