import { AccessLogTable } from "@/components/admin/access-log-table";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";

export default function AccessLogViewsPage() {
  return (
    <AdminAuthGuard requiredAccessLevel="SUPER_ADMIN">
      <AccessLogTable action="VIEW_WARD_DETAIL" />
    </AdminAuthGuard>
  );
}
