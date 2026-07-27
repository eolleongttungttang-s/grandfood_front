import { HealthStatsView } from "@/components/admin/health-stats-view";
import { RESIDENTS } from "@/lib/admin-residents";

export default function AdminHealthStatsPage() {
  return <HealthStatsView residents={RESIDENTS} />;
}
