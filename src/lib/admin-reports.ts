export type ReportStatus = "발행완료" | "작성중";

export type MonthlyReport = {
  id: string;
  period: string;
  title: string;
  status: ReportStatus;
  publishedAt: string | null;
};

export const MONTHLY_REPORTS: MonthlyReport[] = [
  {
    id: "r2607",
    period: "2026년 7월",
    title: "노인복지과 급식지원 월간 보고서",
    status: "작성중",
    publishedAt: null,
  },
  {
    id: "r2606",
    period: "2026년 6월",
    title: "노인복지과 급식지원 월간 보고서",
    status: "발행완료",
    publishedAt: "2026.07.03",
  },
  {
    id: "r2605",
    period: "2026년 5월",
    title: "노인복지과 급식지원 월간 보고서",
    status: "발행완료",
    publishedAt: "2026.06.02",
  },
  {
    id: "r2604",
    period: "2026년 4월",
    title: "노인복지과 급식지원 월간 보고서",
    status: "발행완료",
    publishedAt: "2026.05.03",
  },
];
