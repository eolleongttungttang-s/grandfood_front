export type BudgetRow = {
  id: string;
  org: string;
  category: string;
  allocated: number;
  used: number;
};

export const BUDGET_ROWS: BudgetRow[] = [
  { id: "b1", org: "강남구청", category: "저염 관리형", allocated: 82_000_000, used: 61_400_000 },
  { id: "b2", org: "강남구청", category: "저당 관리형", allocated: 65_000_000, used: 52_800_000 },
  { id: "b3", org: "성북구청", category: "일반 균형식", allocated: 44_000_000, used: 43_100_000 },
  { id: "b4", org: "노원노인복지관", category: "연화식", allocated: 28_000_000, used: 19_600_000 },
  { id: "b5", org: "서대문복지관", category: "저염 관리형", allocated: 21_000_000, used: 8_200_000 },
  { id: "b6", org: "은평구보건소", category: "일반 균형식", allocated: 33_000_000, used: 30_950_000 },
];

export function formatWon(value: number) {
  return `${(value / 10_000).toLocaleString("ko-KR")}만원`;
}
