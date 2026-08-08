export const ADMIN_SESSION_KEY = "grandfood_admin_session";

export type AccessLevel =
  | "SUPER_ADMIN"
  | "MUNICIPALITY_ADMIN"
  | "MUNICIPALITY_STAFF"
  | "WELFARE_STAFF"
  | "VENDOR_STAFF";

export type AdminSession = {
  staffId?: string;
  account: string;
  accessLevel: AccessLevel;
  accessToken?: string;
  name?: string;
  facilityId?: string;
  facilityName?: string;
  facilityCode?: string;
  role?: string;
};

export function createAdminSession(session: AdminSession) {
  return JSON.stringify(session);
}

export function readAdminSession(): AdminSession | null {
  const saved = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!saved) return null;

  try {
    return JSON.parse(saved) as AdminSession;
  } catch {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}
