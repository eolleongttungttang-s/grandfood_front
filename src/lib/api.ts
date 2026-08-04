export function getApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:8000";
  }

  throw new Error("NEXT_PUBLIC_API_URL 환경변수가 설정되지 않았습니다.");
}

export async function postJson<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = (await response.json().catch(() => null)) as
    | (T & { detail?: string })
    | null;
  if (!response.ok) {
    throw new Error(result?.detail ?? `API 요청에 실패했습니다. (${response.status})`);
  }

  return result as T;
}
