import { ReportsView } from "@/components/admin/reports-view";
import { RESIDENTS } from "@/lib/admin-residents";
import { MONTHLY_REPORTS } from "@/lib/admin-reports";

export default function AdminReportsPage() {
  return <ReportsView reports={MONTHLY_REPORTS} residents={RESIDENTS} />;
}
