import { Suspense } from "react";

import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";
import { SuperAdminDashboard } from "@/components/admin/super-admin-dashboard";

const DASHBOARD_ACCESS_LEVELS = ["SUPER_ADMIN", "MUNICIPALITY_ADMIN"] as const;

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <AdminAuthGuard allowedAccessLevels={DASHBOARD_ACCESS_LEVELS}>
        <SuperAdminDashboard />
      </AdminAuthGuard>
    </Suspense>
  );
}
