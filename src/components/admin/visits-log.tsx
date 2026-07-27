"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { Resident } from "@/lib/admin-residents";
import { VisitLog, VisitType } from "@/lib/admin-visits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TYPE_BADGE_CLASS: Record<VisitType, string> = {
  방문: "bg-primary/15 text-primary",
  전화: "bg-accent/15 text-accent",
  문자: "bg-muted text-muted-foreground",
};

function todayLabel() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function VisitsLog({
  initialLogs,
  residents,
}: {
  initialLogs: VisitLog[];
  residents: Resident[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [open, setOpen] = useState(false);
  const [residentName, setResidentName] = useState(residents[0]?.name ?? "");
  const [type, setType] = useState<VisitType>("방문");
  const [note, setNote] = useState("");

  function handleAdd() {
    if (!note.trim()) {
      toast.error("상담 내용을 입력해 주세요.");
      return;
    }
    const entry: VisitLog = {
      id: `v${Date.now()}`,
      date: todayLabel(),
      residentName,
      worker: "박정현 주무관",
      type,
      note: note.trim(),
      followUp: false,
    };
    setLogs((prev) => [entry, ...prev]);
    setNote("");
    setOpen(false);
    toast.success("상담 일지가 등록됐어요.");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <PageHeader
        title="방문·상담 일지"
        description={`최근 ${logs.length}건의 방문·상담 기록`}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus />
            새 일지 추가
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>대상자</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>내용</TableHead>
              <TableHead>후속조치</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">{log.date}</TableCell>
                <TableCell className="font-semibold text-foreground">
                  {log.residentName}
                </TableCell>
                <TableCell className="text-muted-foreground">{log.worker}</TableCell>
                <TableCell>
                  <Badge className={TYPE_BADGE_CLASS[log.type]}>{log.type}</Badge>
                </TableCell>
                <TableCell className="max-w-md text-foreground">{log.note}</TableCell>
                <TableCell>
                  {log.followUp ? (
                    <Badge className="bg-risk-high text-risk-high-foreground">
                      필요
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>새 상담 일지 추가</SheetTitle>
            <SheetDescription>
              방문·전화·문자 상담 내용을 기록하면 대상자 이력에 남아요.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <div className="flex flex-col gap-1.5">
              <Label>대상자</Label>
              <Select
                value={residentName}
                onValueChange={(v) => v && setResidentName(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {residents.map((r) => (
                    <SelectItem key={r.id} value={r.name}>
                      {r.name} · {r.dong}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>상담 유형</Label>
              <Select value={type} onValueChange={(v) => setType(v as VisitType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="방문">방문</SelectItem>
                  <SelectItem value="전화">전화</SelectItem>
                  <SelectItem value="문자">문자</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>상담 내용</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="어떤 내용이었는지 간단히 남겨주세요."
                rows={5}
              />
            </div>
            <Button onClick={handleAdd}>등록하기</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
