import { VisitsLog } from "@/components/admin/visits-log";
import { RESIDENTS } from "@/lib/admin-residents";
import { VISIT_LOGS } from "@/lib/admin-visits";

export default function AdminVisitsPage() {
  return <VisitsLog initialLogs={VISIT_LOGS} residents={RESIDENTS} />;
}
