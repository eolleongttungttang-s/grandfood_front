export type AuditResult = "허용" | "차단";

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  worker: string;
  target: string;
  reason: string;
  ip: string;
  result: AuditResult;
};

export const AUDIT_LOG: AuditLogEntry[] = [
  {
    id: "a1",
    timestamp: "2026.07.27 09:12",
    worker: "박정현 주무관",
    target: "한상옥 (006)",
    reason: "미응답 이상 신호 확인",
    ip: "210.94.12.31",
    result: "허용",
  },
  {
    id: "a2",
    timestamp: "2026.07.27 08:47",
    worker: "박정현 주무관",
    target: "박순자 (001)",
    reason: "3일 미응답 확인",
    ip: "210.94.12.31",
    result: "허용",
  },
  {
    id: "a3",
    timestamp: "2026.07.26 17:03",
    worker: "김미정 사회복지사",
    target: "이말순 (003)",
    reason: "방문 평가 사전 확인",
    ip: "210.94.12.44",
    result: "허용",
  },
  {
    id: "a4",
    timestamp: "2026.07.26 14:20",
    worker: "알 수 없는 세션",
    target: "전체 명단",
    reason: "허용되지 않은 IP 대역에서 접속 시도",
    ip: "118.34.201.9",
    result: "차단",
  },
  {
    id: "a5",
    timestamp: "2026.07.25 22:41",
    worker: "박정현 주무관",
    target: "윤태식 (008)",
    reason: "5일 미응답 긴급 확인",
    ip: "210.94.12.31",
    result: "허용",
  },
  {
    id: "a6",
    timestamp: "2026.07.25 11:05",
    worker: "김미정 사회복지사",
    target: "CSV 내보내기 · 전체 412명",
    reason: "월간 보고서 작성",
    ip: "210.94.12.44",
    result: "허용",
  },
];
