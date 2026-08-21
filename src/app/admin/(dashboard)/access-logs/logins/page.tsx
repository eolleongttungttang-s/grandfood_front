import { AccessLogTable } from "@/components/admin/access-log-table";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";

export default function AccessLogLoginsPage() {
  // 사이드바에서 메뉴를 숨기는 것만으로는 URL 직접 입력을 막지 못한다 — 실제 차단은
  // 백엔드(require_super_admin)가 하고, 이 가드는 그 전에 화면을 되돌려 보내는 역할.
  return (
    <AdminAuthGuard requiredAccessLevel="SUPER_ADMIN">
      <AccessLogTable action="LOGIN" />
    </AdminAuthGuard>
  );
}
