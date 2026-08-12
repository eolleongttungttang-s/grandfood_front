export const ADMIN_SESSION_KEY = "grandfood_admin_session";

export type AccessLevel =
  | "SUPER_ADMIN"
  | "MUNICIPALITY_ADMIN"
  | "MUNICIPALITY_STAFF"
  | "MUNICIPALITY_NUTRITIONIST"
  | "CARE_FACILITY_ADMIN";

export type AdminSession = {
  staffId?: string;
  account: string;
  accessLevel: AccessLevel;
  accessToken?: string;
  name?: string;
  facilityId?: string;
  facilityName?: string;
  facilityCode?: string;
  careFacilityId?: string;
  careFacilityName?: string;
  careFacilityCode?: string;
  facilityType?: string;
  role?: string;
};

export function createAdminSession(session: AdminSession) {
  return JSON.stringify(session);
}

export function getAdminOrganizationName(session: AdminSession | null) {
  if (session?.accessLevel === "CARE_FACILITY_ADMIN") {
    return session.careFacilityName ?? session.facilityName ?? "관할시설";
  }
  return session?.facilityName ?? "지자체";
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
