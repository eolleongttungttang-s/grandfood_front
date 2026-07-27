import { AuditLogView } from "@/components/admin/audit-log-view";
import { AUDIT_LOG } from "@/lib/admin-audit-log";

export default function AdminAuditLogPage() {
  return <AuditLogView entries={AUDIT_LOG} />;
}
