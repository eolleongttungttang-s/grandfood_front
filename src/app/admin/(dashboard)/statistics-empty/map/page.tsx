import { ApiMapMonitoringDashboard } from "@/components/admin/api-map-monitoring-dashboard";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";

const MAP_ACCESS_LEVELS = ["SUPER_ADMIN", "MUNICIPALITY_ADMIN"] as const;

export default function ApiMapMonitoringPage() {
  return (
    <AdminAuthGuard allowedAccessLevels={MAP_ACCESS_LEVELS} unauthorizedRedirectTo="/admin/statistics-empty">
      <ApiMapMonitoringDashboard />
    </AdminAuthGuard>
  );
}
