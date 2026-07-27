"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuditLogEntry } from "@/lib/admin-audit-log";

export function AuditLogView({ entries }: { entries: AuditLogEntry[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return entries;
    return entries.filter(
      (e) => e.worker.includes(q) || e.target.includes(q) || e.reason.includes(q)
    );
  }, [entries, search]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="접근 감사 로그"
        description="개인 건강정보 열람 기록은 모두 자동으로 남아요"
        action={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="담당자·대상자·사유 검색"
              className="w-64 pl-8"
            />
          </div>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>시각</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>열람 대상</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>결과</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  조건에 맞는 로그가 없어요.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground">{e.timestamp}</TableCell>
                <TableCell className="font-semibold text-foreground">{e.worker}</TableCell>
                <TableCell>{e.target}</TableCell>
                <TableCell className="text-muted-foreground">{e.reason}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {e.ip}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      e.result === "허용"
                        ? "bg-risk-normal text-risk-normal-foreground"
                        : "bg-risk-high text-risk-high-foreground"
                    }
                  >
                    {e.result}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
