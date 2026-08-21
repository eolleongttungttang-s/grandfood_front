"use client";

import { useEffect, useState } from "react";
import { KeyRound, ScrollText, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACCESS_LEVEL_LABEL,
  fetchAccessLogs,
  verifyAccessLogs,
  type AccessLogAction,
  type AccessLogEntry,
  type AccessLogIntegrity,
} from "@/lib/admin-access-log";

/** 로그인 기록 / 개인정보 열람기록 두 화면이 이 컴포넌트 하나를 공유한다 — 표의 모양은
 * 같고 어떤 기록을 받아오는지(action)와 문구만 다르다. */
const VIEW_CONFIG: Record<
  AccessLogAction,
  { title: string; description: string; icon: typeof KeyRound; showTarget: boolean }
> = {
  LOGIN: {
    title: "로그인 기록",
    description: "담당자가 관리자 화면에 로그인한 기록입니다. 최종관리자도 예외 없이 남습니다.",
    icon: KeyRound,
    // LOGIN 기록엔 열람 대상이 없으므로 "대상자" 열 자체를 띄우지 않는다.
    showTarget: false,
  },
  VIEW_WARD_DETAIL: {
    title: "개인정보 열람기록",
    description:
      "담당자가 대상자의 개인정보·건강정보 상세를 열람한 기록입니다. 최종관리자도 예외 없이 남습니다.",
    icon: ScrollText,
    showTarget: true,
  },
};

function formatDateTime(isoString: string) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** 해시 체인 검사 결과를 한 줄로 보여준다. 이 배지가 없으면 해시 체인은 아무도 안 보는
 * 값에 그친다 — 조작을 "막는" 게 아니라 "드러나게" 하는 장치라, 드러난 걸 보여주는
 * 자리가 있어야 의미가 생긴다. */
function IntegrityBadge({ integrity }: { integrity: AccessLogIntegrity | null }) {
  if (!integrity) return null;

  if (integrity.ok) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-risk-normal-foreground" />
        무결성 확인됨 · 기록 {integrity.checked.toLocaleString()}건이 위·변조 없이 이어져
        있습니다.
      </p>
    );
  }

  return (
    <p className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-destructive">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        무결성 경고 — {integrity.reason ?? "기록이 변경된 흔적이 있습니다."}
        {integrity.broken_at && (
          <span className="block font-normal">
            처음 어긋난 기록: {integrity.broken_at} (앞쪽 {integrity.checked.toLocaleString()}건은
            정상)
          </span>
        )}
      </span>
    </p>
  );
}

export function AccessLogTable({ action }: { action: AccessLogAction }) {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [integrity, setIntegrity] = useState<AccessLogIntegrity | null>(null);
  const [loading, setLoading] = useState(true);

  const config = VIEW_CONFIG[action];
  const Icon = config.icon;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchAccessLogs(action)
      .then((rows) => {
        if (!cancelled) setLogs(rows);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLogs([]);
        toast.error(error instanceof Error ? error.message : "기록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // 무결성 검사는 목록과 독립적으로 진행한다 — 전체 기록을 훑느라 느리므로, 이걸
    // 기다리다 표가 늦게 뜨면 안 된다. 실패해도 목록은 그대로 보여준다.
    verifyAccessLogs()
      .then((result) => {
        if (!cancelled) setIntegrity(result);
      })
      .catch(() => {
        if (!cancelled) setIntegrity(null);
      });

    return () => {
      cancelled = true;
    };
  }, [action]);

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight">{config.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        <IntegrityBadge integrity={integrity} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" /> 최근 기록
          </CardTitle>
          <CardDescription>
            최신순 100건까지 표시합니다. 기록은 열람만 가능하며 수정하거나 삭제할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              기록을 불러오는 중입니다.
            </p>
          )}

          {!loading && logs.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              아직 남은 기록이 없습니다.
            </p>
          )}

          {!loading && logs.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>일시</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>아이디</TableHead>
                    <TableHead>권한</TableHead>
                    {config.showTarget && <TableHead>열람한 대상자</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className="font-semibold">{log.actor_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.actor_account ?? "-"}
                      </TableCell>
                      <TableCell>
                        {ACCESS_LEVEL_LABEL[log.actor_access_level] ?? log.actor_access_level}
                      </TableCell>
                      {config.showTarget && (
                        <TableCell className="font-semibold">
                          {log.target_user_name ?? "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
