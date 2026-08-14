"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { type AccessLevel, readAdminSession } from "@/lib/admin-auth";

export function AdminAuthGuard({
  children,
  requiredAccessLevel,
  allowedAccessLevels,
  unauthorizedRedirectTo = "/admin/residents",
}: {
  children: React.ReactNode;
  requiredAccessLevel?: AccessLevel;
  allowedAccessLevels?: readonly AccessLevel[];
  unauthorizedRedirectTo?: string;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const session = readAdminSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }

    if (requiredAccessLevel && session.accessLevel !== requiredAccessLevel) {
      router.replace(unauthorizedRedirectTo);
      return;
    }

    if (allowedAccessLevels && !allowedAccessLevels.includes(session.accessLevel)) {
      router.replace(unauthorizedRedirectTo);
      return;
    }

    const timeoutId = window.setTimeout(() => setIsAuthenticated(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, [allowedAccessLevels, requiredAccessLevel, router, unauthorizedRedirectTo]);

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        로그인 정보를 확인하고 있습니다.
      </main>
    );
  }

  return children;
}
