import { PageHeader } from "@/components/admin/page-header";
import { Resident, RiskLevel } from "@/lib/admin-residents";

const RISK_BAR_CLASS: Record<RiskLevel, string> = {
  고위험: "bg-risk-high-foreground",
  주의: "bg-risk-caution-foreground",
  보통: "bg-chart-4",
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-extrabold text-foreground">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function HealthStatsView({ residents }: { residents: Resident[] }) {
  const total = residents.length;
  const avgAge = Math.round(
    residents.reduce((sum, r) => sum + r.age, 0) / total
  );

  const riskCounts: Record<RiskLevel, number> = { 고위험: 0, 주의: 0, 보통: 0 };
  for (const r of residents) riskCounts[r.risk]++;

  const conditionCounts = new Map<string, number>();
  for (const r of residents) {
    for (const part of r.condition.split("·")) {
      const name = part.trim();
      if (!name) continue;
      conditionCounts.set(name, (conditionCounts.get(name) ?? 0) + 1);
    }
  }
  const topConditions = Array.from(conditionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const dongMap = new Map<string, Resident[]>();
  for (const r of residents) {
    dongMap.set(r.dong, [...(dongMap.get(r.dong) ?? []), r]);
  }
  const dongRows = Array.from(dongMap.entries())
    .map(([dong, list]) => ({
      dong,
      count: list.length,
      avgAge: Math.round(list.reduce((s, r) => s + r.age, 0) / list.length),
      highRisk: list.filter((r) => r.risk === "고위험").length,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="지역 건강 지표"
        description="관내 급식 지원 어르신의 건강 데이터를 동 단위로 요약해요"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="전체 대상자" value={`${total}명`} />
        <StatCard label="평균 연령" value={`${avgAge}세`} />
        <StatCard
          label="고위험군 비율"
          value={`${Math.round((riskCounts.고위험 / total) * 100)}%`}
          hint={`${riskCounts.고위험}명`}
        />
        <StatCard label="1인당 평균 만성질환" value="2.1개" hint="중복 보유 기준" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">위험군 분포</h2>
          <div className="flex flex-col gap-3">
            {(Object.keys(riskCounts) as RiskLevel[]).map((level) => (
              <div key={level} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm text-foreground">
                  <span>{level}</span>
                  <span className="font-semibold">
                    {riskCounts[level]}명 ·{" "}
                    {Math.round((riskCounts[level] / total) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${RISK_BAR_CLASS[level]}`}
                    style={{ width: `${(riskCounts[level] / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">주요 질환 분포</h2>
          <div className="flex flex-col gap-3">
            {topConditions.map(([name, count]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm text-foreground">
                  <span>{name}</span>
                  <span className="font-semibold">{count}명</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold text-foreground">동별 현황</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold text-muted-foreground">
              <th className="px-5 py-3">동</th>
              <th className="px-5 py-3">인원</th>
              <th className="px-5 py-3">평균 연령</th>
              <th className="px-5 py-3">고위험군</th>
            </tr>
          </thead>
          <tbody>
            {dongRows.map((row) => (
              <tr key={row.dong} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-semibold text-foreground">{row.dong}</td>
                <td className="px-5 py-3 text-muted-foreground">{row.count}명</td>
                <td className="px-5 py-3 text-muted-foreground">{row.avgAge}세</td>
                <td className="px-5 py-3 text-muted-foreground">{row.highRisk}명</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
