"use client";

import { Download } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Resident } from "@/lib/admin-residents";
import { MonthlyReport } from "@/lib/admin-reports";

function downloadReport(report: MonthlyReport, residents: Resident[]) {
  const highRisk = residents.filter((r) => r.risk === "고위험").length;
  const lines = [
    `${report.title}`,
    `대상 기간: ${report.period}`,
    `발행일: ${report.publishedAt ?? "-"}`,
    "",
    `전체 대상자: ${residents.length}명`,
    `고위험군: ${highRisk}명`,
    `평균 연령: ${Math.round(
      residents.reduce((s, r) => s + r.age, 0) / residents.length
    )}세`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `grandfood-보고서-${report.id}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView({
  reports,
  residents,
}: {
  reports: MonthlyReport[];
  residents: Resident[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="월간 보고서 출력"
        description="발행된 보고서는 바로 다운로드할 수 있어요"
      />

      <div className="flex flex-col gap-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{report.title}</span>
                <Badge
                  className={
                    report.status === "발행완료"
                      ? "bg-risk-normal text-risk-normal-foreground"
                      : "bg-risk-caution text-risk-caution-foreground"
                  }
                >
                  {report.status}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {report.period}
                {report.publishedAt && ` · ${report.publishedAt} 발행`}
              </span>
            </div>
            <Button
              size="sm"
              variant={report.status === "발행완료" ? "default" : "outline"}
              disabled={report.status !== "발행완료"}
              onClick={() => downloadReport(report, residents)}
            >
              <Download />
              다운로드
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
