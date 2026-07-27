"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PermissionRole, StaffMember } from "@/lib/admin-staff";

export function PermissionsView({ staff }: { staff: StaffMember[] }) {
  const [members, setMembers] = useState(staff);

  function toggleActive(id: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))
    );
    const member = members.find((m) => m.id === id);
    if (member) {
      toast.success(
        member.active ? `${member.name}님 계정을 비활성화했어요.` : `${member.name}님 계정을 다시 활성화했어요.`
      );
    }
  }

  function changeRole(id: string, role: PermissionRole) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="담당자 권한"
        description="부서 담당자별 접근 권한과 계정 상태를 관리해요"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>직급</TableHead>
              <TableHead>권한 범위</TableHead>
              <TableHead>마지막 로그인</TableHead>
              <TableHead>계정 상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-semibold text-foreground">{m.name}</TableCell>
                <TableCell className="text-muted-foreground">{m.title}</TableCell>
                <TableCell>
                  <Select
                    value={m.role}
                    onValueChange={(v) => changeRole(m.id, v as PermissionRole)}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="관리자">관리자</SelectItem>
                      <SelectItem value="편집자">편집자</SelectItem>
                      <SelectItem value="뷰어">뷰어</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.lastLogin}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.active}
                      onCheckedChange={() => toggleActive(m.id)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {m.active ? "활성" : "비활성"}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
