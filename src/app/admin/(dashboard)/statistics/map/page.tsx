import { MapMonitoringDashboard } from "@/components/admin/map-monitoring-dashboard";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";

const MAP_ACCESS_LEVELS = ["SUPER_ADMIN", "MUNICIPALITY_ADMIN"] as const;

export default function MapMonitoringPage() {
  return (
    <AdminAuthGuard allowedAccessLevels={MAP_ACCESS_LEVELS} unauthorizedRedirectTo="/admin/statistics">
      <MapMonitoringDashboard />
    </AdminAuthGuard>
  );
}
