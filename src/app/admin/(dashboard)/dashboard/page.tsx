import { Suspense } from "react";

import { SuperAdminDashboard } from "@/components/admin/super-admin-dashboard";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <SuperAdminDashboard />
    </Suspense>
  );
}
