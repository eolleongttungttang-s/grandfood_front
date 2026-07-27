import { ResidentsTable } from "@/components/admin/residents-table";
import { RESIDENTS, RiskLevel } from "@/lib/admin-residents";

const VALID_RISK: RiskLevel[] = ["고위험", "주의", "보통"];

export default async function AdminResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ risk?: string }>;
}) {
  const { risk } = await searchParams;
  const initialRisk = VALID_RISK.includes(risk as RiskLevel)
    ? (risk as RiskLevel)
    : "all";

  return <ResidentsTable data={RESIDENTS} initialRisk={initialRisk} />;
}
