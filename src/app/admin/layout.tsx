import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GrandFood · 정부 Admin",
  description: "기관 담당자 전용 보안 관리자 페이지",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
