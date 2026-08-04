export const ADMIN_SESSION_KEY = "grandfood_admin_session";
export const TEST_ADMIN_ACCOUNTS_KEY = "grandfood_test_admin_accounts";
export const TEST_SIGNUP_REQUESTS_KEY = "grandfood_test_signup_requests";

export type AccessLevel =
  | "SUPER_ADMIN"
  | "MUNICIPALITY_ADMIN"
  | "MUNICIPALITY_STAFF"
  | "WELFARE_STAFF"
  | "VENDOR_STAFF";

export type AdminSession = {
  account: string;
  accessLevel: AccessLevel;
  accessToken?: string;
  name?: string;
  facilityName?: string;
  role?: string;
};

export type TestAdminAccount = AdminSession & {
  password: string;
  email: string;
  role: string;
  facilityId: number;
};

export type TestSignupRequest = {
  id: number;
  name: string;
  account: string;
  password: string;
  email: string;
  phone: string;
  facilityName: string;
  facilityCode: string;
  workplaceName: string;
  role: string;
  department: string;
  requestedAt: string;
};

export const TEST_SUPER_ADMIN = {
  account: "grandfood",
  password: "123",
  accessLevel: "SUPER_ADMIN",
} as const;

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

export function getTestAdminAccounts(): TestAdminAccount[] {
  const saved = window.localStorage.getItem(TEST_ADMIN_ACCOUNTS_KEY);
  if (!saved) return [];

  try {
    return (JSON.parse(saved) as Array<
      Partial<TestAdminAccount> & {
        municipalityId?: number;
        municipalityName?: string;
        position?: string;
      }
    >).map((item) => {
      const legacyAccessLevel = item.role as AccessLevel | undefined;
      return {
        account: item.account ?? "",
        password: item.password ?? "",
        accessLevel: item.accessLevel ?? legacyAccessLevel ?? "MUNICIPALITY_STAFF",
        name: item.name,
        email: item.email ?? "",
        role: item.position ?? item.role ?? "담당자",
        facilityId: item.facilityId ?? item.municipalityId ?? 0,
        facilityName: item.facilityName ?? item.municipalityName,
      };
    });
  } catch {
    window.localStorage.removeItem(TEST_ADMIN_ACCOUNTS_KEY);
    return [];
  }
}

export function saveTestAdminAccount(account: TestAdminAccount) {
  const accounts = getTestAdminAccounts().filter(
    (item) => item.account !== account.account,
  );
  window.localStorage.setItem(
    TEST_ADMIN_ACCOUNTS_KEY,
    JSON.stringify([...accounts, account]),
  );
}

export function getTestSignupRequests(): TestSignupRequest[] {
  const saved = window.localStorage.getItem(TEST_SIGNUP_REQUESTS_KEY);
  if (!saved) return [];

  try {
    return (JSON.parse(saved) as Array<
      Partial<TestSignupRequest> & {
        municipalityName?: string;
        organizationCode?: string;
        workplace?: string;
        jobRole?: string;
      }
    >).map((item) => ({
      id: item.id ?? Date.now(),
      name: item.name ?? "",
      account: item.account ?? "",
      password: item.password ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      facilityName: item.facilityName ?? item.municipalityName ?? "",
      facilityCode: item.facilityCode ?? item.organizationCode ?? "",
      workplaceName: item.workplaceName ?? item.workplace ?? "",
      role: item.role ?? item.jobRole ?? "담당자",
      department: item.department ?? "",
      requestedAt: item.requestedAt ?? "",
    }));
  } catch {
    window.localStorage.removeItem(TEST_SIGNUP_REQUESTS_KEY);
    return [];
  }
}

export function saveTestSignupRequests(requests: TestSignupRequest[]) {
  window.localStorage.setItem(TEST_SIGNUP_REQUESTS_KEY, JSON.stringify(requests));
}

export function authenticateTestAdmin(account: string, password: string) {
  if (
    account === TEST_SUPER_ADMIN.account &&
    password === TEST_SUPER_ADMIN.password
  ) {
    return {
      account: TEST_SUPER_ADMIN.account,
      accessLevel: TEST_SUPER_ADMIN.accessLevel,
      name: "GrandFood 최종관리자",
    } satisfies AdminSession;
  }

  const issuedAccount = getTestAdminAccounts().find(
    (item) => item.account === account && item.password === password,
  );
  if (!issuedAccount) return null;

  return {
    account: issuedAccount.account,
    accessLevel: issuedAccount.accessLevel,
    name: issuedAccount.name,
    facilityName: issuedAccount.facilityName,
    role: issuedAccount.role,
  } satisfies AdminSession;
}
