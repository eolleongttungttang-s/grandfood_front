import { getJson } from "@/lib/api";

/** 백엔드 access_logs.action_type과 같은 값. 로그인 기록 화면과 개인정보 열람기록
 * 화면이 이 값으로 나뉜다. */
export type AccessLogAction = "LOGIN" | "VIEW_WARD_DETAIL";

/** GET /gov/access-logs 응답 한 줄. 백엔드가 snake_case로 내려주므로 그대로 받는다
 * (admin-wards-api.ts의 WardDetail과 같은 방식). */
export type AccessLogEntry = {
  id: string;
  actor_staff_id: string;
  actor_name: string;
  actor_account: string | null;
  actor_access_level: string;
  action_type: AccessLogAction;
  /** LOGIN 기록이면 둘 다 null — 로그인은 열람 대상이 없는 행위라서. */
  target_user_id: string | null;
  target_user_name: string | null;
  created_at: string;
};

export const ACCESS_LEVEL_LABEL: Record<string, string> = {
  SUPER_ADMIN: "최종관리자",
  MUNICIPALITY_ADMIN: "지자체 관리자",
  MUNICIPALITY_STAFF: "지자체 담당자",
  MUNICIPALITY_NUTRITIONIST: "지자체 영양사",
  CARE_FACILITY_ADMIN: "시설 관리자",
  CARE_FACILITY_NUTRITIONIST: "시설 영양사",
};

/** 해시 체인 검사 결과 — "기록이 조작되지 않았는가"에 대한 답. */
export type AccessLogIntegrity = {
  ok: boolean;
  /** 검사한 기록 수. ok가 false면 "여기까지는 멀쩡했다"는 뜻. */
  checked: number;
  /** 처음 어긋난 기록의 id (정상이면 null). */
  broken_at: string | null;
  reason: string | null;
};

/** SUPER_ADMIN 전용 API — 다른 권한으로 호출하면 백엔드가 403으로 막는다.
 * 인증 토큰은 getJson이 알아서 붙인다. */
export function fetchAccessLogs(action: AccessLogAction): Promise<AccessLogEntry[]> {
  return getJson<AccessLogEntry[]>(`/gov/access-logs?action_type=${action}`);
}

/** 기록 전체를 훑는 검사라 목록 조회보다 느리다 — 화면당 한 번만 부른다. */
export function verifyAccessLogs(): Promise<AccessLogIntegrity> {
  return getJson<AccessLogIntegrity>("/gov/access-logs/verify");
}
