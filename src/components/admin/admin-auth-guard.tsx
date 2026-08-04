"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccessLevel, readAdminSession } from "@/lib/admin-auth";

export function AdminAuthGuard({
  children,
  requiredAccessLevel,
}: {
  children: React.ReactNode;
  requiredAccessLevel?: AccessLevel;
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
      router.replace("/admin/residents");
      return;
    }

    const timeoutId = window.setTimeout(() => setIsAuthenticated(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, [requiredAccessLevel, router]);

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        로그인 정보를 확인하고 있습니다.
      </main>
    );
  }

  return children;
}
