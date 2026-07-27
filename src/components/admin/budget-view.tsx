import { PageHeader } from "@/components/admin/page-header";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BUDGET_ROWS, formatWon } from "@/lib/admin-budget";

export function BudgetView() {
  const totalAllocated = BUDGET_ROWS.reduce((s, r) => s + r.allocated, 0);
  const totalUsed = BUDGET_ROWS.reduce((s, r) => s + r.used, 0);
  const rate = Math.round((totalUsed / totalAllocated) * 100);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="급식 예산 집행"
        description="협약 기관·식단 유형별 예산 배정과 집행 현황이에요"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">총 배정 예산</span>
          <span className="text-2xl font-extrabold text-foreground">
            {formatWon(totalAllocated)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">총 집행액</span>
          <span className="text-2xl font-extrabold text-foreground">
            {formatWon(totalUsed)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">집행률</span>
          <span className="text-2xl font-extrabold text-primary">{rate}%</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>협약 기관</TableHead>
              <TableHead>식단 유형</TableHead>
              <TableHead>배정 예산</TableHead>
              <TableHead>집행액</TableHead>
              <TableHead>잔여</TableHead>
              <TableHead className="w-[160px]">집행률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {BUDGET_ROWS.map((row) => {
              const pct = Math.round((row.used / row.allocated) * 100);
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-semibold text-foreground">
                    {row.org}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.category}
                  </TableCell>
                  <TableCell>{formatWon(row.allocated)}</TableCell>
                  <TableCell>{formatWon(row.used)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatWon(row.allocated - row.used)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2" />
                      <span className="w-9 shrink-0 text-xs text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
