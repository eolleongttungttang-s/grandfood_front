import { ADMIN_SESSION_KEY, type AdminSession } from "@/lib/admin-auth";

export function getApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8000";
  }

  throw new Error("NEXT_PUBLIC_API_URL 환경변수가 설정되지 않았습니다.");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAccessToken() {
  if (typeof window === "undefined") return null;

  const saved = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!saved) return null;

  try {
    return (JSON.parse(saved) as AdminSession).accessToken ?? null;
  } catch {
    return null;
  }
}

function createHeaders(hasJsonBody = false) {
  const headers = new Headers({ Accept: "application/json" });
  if (hasJsonBody) headers.set("Content-Type", "application/json");

  const accessToken = getAccessToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

/** FastAPI의 422는 detail이 문자열이 아니라 밸리데이션 에러 객체 배열
 * ([{loc, msg, type}, ...])로 온다 — 이걸 그대로 Error 메시지에 넣으면
 * "[object Object]"로 보인다. 문자열이면 그대로, 배열이면 msg들을 이어 붙인다. */
export function extractErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((item) => (item && typeof item === "object" && "msg" in item ? String(item.msg) : null))
      .filter((msg): msg is string => Boolean(msg));
    if (messages.length > 0) return messages.join(" / ");
  }
  return fallback;
}

export function userFacingErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message)) {
    return "서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }

  return message || fallback;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const result = (await response.json().catch(() => null)) as
    | (T & { detail?: unknown })
    | null;

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(result?.detail, `API 요청에 실패했습니다. (${response.status})`),
      response.status,
    );
  }

  return result as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "GET",
    headers: createHeaders(),
    cache: "no-store",
  });

  return parseResponse<T>(response);
}

export async function postJson<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: createHeaders(true),
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}

export async function patchJson<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "PATCH",
    headers: createHeaders(true),
    body: JSON.stringify(payload),
  });

  return parseResponse<T>(response);
}
