"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  KeyRound,
  Plus,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTestSignupRequests,
  saveTestAdminAccount,
  saveTestSignupRequests,
  TestSignupRequest,
} from "@/lib/admin-auth";
import { postJson } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Facility = {
  facilityId: string;
  facilityName: string;
  facilityType: "MUNICIPALITY";
  department: string;
  facilityCode: string;
  managerAccount: string | null;
  status: "활성" | "준비 중";
};

const INITIAL_FACILITIES: Facility[] = [];
const FACILITIES_STORAGE_KEY = "grandfood_test_facilities";
const LEGACY_MUNICIPALITIES_STORAGE_KEY = "grandfood_test_municipalities";

const MUNICIPALITY_PREFIXES: Record<string, string> = {
  강남구청: "GN",
  강동구청: "GD",
  강북구청: "GB",
  강서구청: "GS",
  관악구청: "GA",
  광진구청: "GJ",
  구로구청: "GR",
  금천구청: "GC",
  노원구청: "NW",
  도봉구청: "DB",
  동대문구청: "DDM",
  동작구청: "DJ",
  마포구청: "MP",
  서대문구청: "SDM",
  서초구청: "SC",
  성동구청: "SD",
  성북구청: "SB",
  송파구청: "SP",
  양천구청: "YC",
  영등포구청: "YDP",
  용산구청: "YS",
  은평구청: "EP",
  종로구청: "JR",
  중구청: "JG",
  중랑구청: "JL",
};

function createFacilityCode(name: string, sequence: number) {
  const latinPrefix = name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  const prefix = MUNICIPALITY_PREFIXES[name] ?? latinPrefix ?? "GF";
  return `${prefix || "GF"}-${String(sequence).padStart(4, "0")}`;
}

function createTemporaryPassword() {
  return `Gf!${Math.random().toString(36).slice(2, 10)}9`;
}

function calculateContractEnd(startDate: string, years: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const endDate = new Date(year + years, month - 1, day);
  endDate.setDate(endDate.getDate() - 1);
  return [
    endDate.getFullYear(),
    String(endDate.getMonth() + 1).padStart(2, "0"),
    String(endDate.getDate()).padStart(2, "0"),
  ].join("-");
}

export function SuperAdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const section =
    searchParams.get("section") === "approvals" ? "approvals" : "registration";
  const [facilities, setFacilities] = useState(INITIAL_FACILITIES);
  const activePanel =
    searchParams.get("panel") === "account" ? "account" : "facility";
  const [issuedAccount, setIssuedAccount] = useState<{
    account: string;
    password: string;
    facilityName: string;
  } | null>(null);
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [managerPassword, setManagerPassword] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved =
        window.localStorage.getItem(FACILITIES_STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_MUNICIPALITIES_STORAGE_KEY);
      if (!saved) return;

      try {
        const parsed = (JSON.parse(saved) as Array<
          Partial<Facility> & { id?: number | string; name?: string; code?: string }
        >).map((item) => ({
          facilityId: String(item.facilityId ?? item.id ?? Date.now()),
          facilityName: item.facilityName ?? item.name ?? "이름 미지정 기관",
          facilityType: "MUNICIPALITY" as const,
          department: item.department ?? "",
          facilityCode: item.facilityCode ?? item.code ?? "GF-0000",
          managerAccount: item.managerAccount ?? null,
          status: item.status ?? "준비 중",
        }));
        setFacilities(parsed);
        window.localStorage.setItem(FACILITIES_STORAGE_KEY, JSON.stringify(parsed));
      } catch {
        window.localStorage.removeItem(FACILITIES_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_MUNICIPALITIES_STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function saveFacilities(next: Facility[]) {
    setFacilities(next);
    window.localStorage.setItem(FACILITIES_STORAGE_KEY, JSON.stringify(next));
  }

  async function registerFacility(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("facilityName") ?? "").trim();
    const department = String(form.get("department") ?? "").trim();
    const contractStartDate = String(form.get("contractStart") ?? "");
    const contractEndDate = String(form.get("contractEnd") ?? "");

    if (!name) return;
    if (facilities.some((item) => item.facilityName === name)) {
      toast.error("이미 등록된 지자체입니다.");
      return;
    }

    const nextSequence =
      facilities.reduce((largest, item) => {
        const sequence = Number(item.facilityCode.split("-").at(-1));
        return Number.isFinite(sequence) ? Math.max(largest, sequence) : largest;
      }, 0) + 1;
    const facilityCode = createFacilityCode(name, nextSequence);

    try {
      const result = await postJson<{
        facility_id: string;
        name?: string;
        facility_code?: string;
      }>("/api/admin/facilities", {
        name,
        facility_type: "MUNICIPALITY",
        department: department || null,
        contract_start_date: contractStartDate,
        contract_end_date: contractEndDate,
        facility_code: facilityCode,
      });
      saveFacilities([
        ...facilities,
        {
          facilityId: result.facility_id,
          facilityName: result.name ?? name,
          facilityType: "MUNICIPALITY",
          department,
          facilityCode: result?.facility_code ?? facilityCode,
          managerAccount: null,
          status: "준비 중",
        },
      ]);
      formElement.reset();
      setContractStart("");
      setContractEnd("");
      toast.success(`${name}을 등록했습니다.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "지자체를 등록하지 못했습니다.",
      );
    }
  }

  async function issueManagerAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const facilityId = String(form.get("facilityId") ?? "");
    const managerName = String(form.get("managerName") ?? "").trim();
    const position = String(form.get("position") ?? "").trim();
    const account = String(form.get("managerAccount") ?? "").trim();
    const email = String(form.get("managerEmail") ?? "").trim();
    const password = String(form.get("managerPassword") ?? "");
    const facility = facilities.find((item) => item.facilityId === facilityId);

    if (!facility || !account || !password) return;

    try {
      await postJson("/api/admin/staff", {
        facility_id: facility.facilityId,
        facility_name: facility.facilityName,
        facility_code: facility.facilityCode,
        name: managerName,
        role: position,
        account,
        email,
        temporary_password: password,
        access_level: "MUNICIPALITY_ADMIN",
      });
      saveFacilities(
        facilities.map((item) =>
          item.facilityId === facilityId
            ? { ...item, managerAccount: account, status: "활성" as const }
            : item,
        ),
      );
      setIssuedAccount({ account, password, facilityName: facility.facilityName });
      saveTestAdminAccount({
        account,
        password,
        accessLevel: "MUNICIPALITY_ADMIN",
        name: managerName,
        email,
        role: position,
        facilityId: facility.facilityId,
        facilityName: facility.facilityName,
      });
      formElement.reset();
      setManagerPassword("");
      toast.success(`${facility.facilityName} 관리자 계정을 발급했습니다.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "관리자 계정을 발급하지 못했습니다.",
      );
    }
  }

  const activeManagers = facilities.filter((item) => item.managerAccount).length;

  if (section === "approvals") {
    return <SignupApprovalPanel />;
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title="최종관리자 대시보드"
        description="지자체를 등록하고 기관코드와 지자체 관리자 계정을 발급합니다."
        action={
          <Badge variant="secondary" className="h-7 px-3">
            <ShieldCheck /> SUPER ADMIN
          </Badge>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "등록 지자체", value: facilities.length, icon: Building2 },
          { label: "활성 관리자", value: activeManagers, icon: UsersRound },
          { label: "활성 기관코드", value: facilities.length, icon: KeyRound },
          {
            label: "발급 준비",
            value: facilities.length - activeManagers,
            icon: CheckCircle2,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-extrabold">{value}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <CardTitle>발급 작업</CardTitle>
            <CardDescription>먼저 지자체를 등록한 후 관리자 계정을 발급하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <Button
                type="button"
                variant={activePanel === "facility" ? "default" : "ghost"}
                onClick={() =>
                  router.replace(
                    "/admin/dashboard?section=registration&panel=facility",
                  )
                }
              >
                <Plus /> 지자체 등록
              </Button>
              <Button
                type="button"
                variant={activePanel === "account" ? "default" : "ghost"}
                onClick={() =>
                  router.replace("/admin/dashboard?section=registration&panel=account")
                }
              >
                <UserPlus /> 관리자 발급
              </Button>
            </div>

            {activePanel === "facility" ? (
              <form className="space-y-4" onSubmit={registerFacility}>
                <div className="space-y-2">
                  <Label htmlFor="facilityName">지자체명</Label>
                  <Input id="facilityName" name="facilityName" placeholder="예: 마포구청" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">담당 부서</Label>
                  <select
                    id="department"
                    name="department"
                    defaultValue=""
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">선택 안 함</option>
                    <option value="어르신복지과">어르신복지과</option>
                    <option value="노인복지과">노인복지과</option>
                    <option value="복지정책과">복지정책과</option>
                    <option value="사회복지과">사회복지과</option>
                    <option value="통합돌봄과">통합돌봄과</option>
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contractStart">계약 시작일</Label>
                    <Input
                      id="contractStart"
                      name="contractStart"
                      type="date"
                      value={contractStart}
                      onChange={(event) => {
                        setContractStart(event.target.value);
                        setContractEnd("");
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractEnd">계약 종료일</Label>
                    <Input
                      id="contractEnd"
                      name="contractEnd"
                      type="date"
                      value={contractEnd}
                      onChange={(event) => setContractEnd(event.target.value)}
                      min={contractStart}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    계약 기간 빠른 선택
                  </span>
                  {[1, 2, 3].map((years) => (
                    <Button
                      key={years}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!contractStart}
                      onClick={() =>
                        setContractEnd(calculateContractEnd(contractStart, years))
                      }
                    >
                      {years}년
                    </Button>
                  ))}
                </div>
                <Button type="submit" className="w-full">
                  <Building2 /> 지자체 및 기관코드 생성
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={issueManagerAccount}>
                <div className="space-y-2">
                  <Label htmlFor="facilityId">소속 지자체</Label>
                  <select
                    id="facilityId"
                    name="facilityId"
                    required
                    defaultValue=""
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="" disabled>지자체 선택</option>
                    {facilities.map((item) => (
                      <option key={item.facilityId} value={item.facilityId}>
                        {item.facilityName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="managerName">관리자 이름</Label>
                    <Input id="managerName" name="managerName" placeholder="이름 입력" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">직책</Label>
                    <Input id="position" name="position" placeholder="예: 팀장" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerAccount">발급 아이디</Label>
                  <Input id="managerAccount" name="managerAccount" placeholder="예: mapo_admin" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerEmail">업무용 이메일</Label>
                  <Input id="managerEmail" name="managerEmail" type="email" placeholder="name@example.go.kr" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="managerPassword">임시 비밀번호</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setManagerPassword(createTemporaryPassword())}
                    >
                      자동 생성
                    </Button>
                  </div>
                  <Input
                    id="managerPassword"
                    name="managerPassword"
                    type="text"
                    value={managerPassword}
                    onChange={(event) => setManagerPassword(event.target.value)}
                    placeholder="임시 비밀번호 입력 또는 자동 생성"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    최초 로그인 시 비밀번호를 변경하도록 안내해 주세요.
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  <KeyRound /> 관리자 계정 발급
                </Button>
              </form>
            )}

            {issuedAccount && (
              <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="font-bold">최근 발급 정보</p>
                <dl className="mt-3 grid grid-cols-[90px_1fr] gap-2 text-sm">
                  <dt className="text-muted-foreground">지자체</dt><dd>{issuedAccount.facilityName}</dd>
                  <dt className="text-muted-foreground">아이디</dt><dd className="font-mono">{issuedAccount.account}</dd>
                  <dt className="text-muted-foreground">임시 비밀번호</dt><dd className="font-mono">{issuedAccount.password}</dd>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">실제 서비스에서는 최초 로그인 시 비밀번호 변경이 필요합니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>지자체 및 계정 현황</CardTitle>
            <CardDescription>등록된 지자체의 기관코드와 관리자 발급 상태입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>지자체</TableHead>
                  <TableHead>담당 부서</TableHead>
                  <TableHead>기관코드</TableHead>
                  <TableHead>관리자 계정</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilities.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      등록된 지자체가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
                {facilities.map((item) => (
                  <TableRow key={item.facilityId}>
                    <TableCell className="font-semibold">{item.facilityName}</TableCell>
                    <TableCell>{item.department || "미지정"}</TableCell>
                    <TableCell className="font-mono">{item.facilityCode}</TableCell>
                    <TableCell>{item.managerAccount ?? "미발급"}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "활성" ? "default" : "secondary"}>
                        {item.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function SignupApprovalPanel() {
  const [requests, setRequests] = useState<TestSignupRequest[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setRequests(getTestSignupRequests());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function handleRequest(id: number, result: "승인" | "거절") {
    const request = requests.find((item) => item.id === id);
    if (!request) return;

    if (result === "승인") {
      saveTestAdminAccount({
        account: request.account,
        password: request.password,
        accessLevel:
          request.role === "담당 공무원"
            ? "MUNICIPALITY_STAFF"
            : "WELFARE_STAFF",
        name: request.name,
        email: request.email,
        role: request.role,
        facilityId: "",
        facilityName: request.facilityName,
      });
    }

    const next = requests.filter((request) => request.id !== id);
    setRequests(next);
    saveTestSignupRequests(next);
    toast.success(`회원가입 신청을 ${result}했습니다.`);
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title="담당자 등록"
        description="회원가입을 신청한 담당자의 소속 정보를 확인하고 가입을 승인합니다."
        action={<Badge variant="secondary">승인 대기 {requests.length}건</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>회원가입 승인 대기</CardTitle>
          <CardDescription>
            기관코드, 소속기관 및 담당 업무를 확인한 후 처리해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신청자</TableHead>
                <TableHead>아이디</TableHead>
                <TableHead>관할 지자체</TableHead>
                <TableHead>기관코드</TableHead>
                <TableHead>근무 기관</TableHead>
                <TableHead>담당 업무</TableHead>
                <TableHead>신청일</TableHead>
                <TableHead className="text-right">처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-40 text-center text-muted-foreground"
                  >
                    승인 대기 중인 회원가입 신청이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-semibold">{request.name}</TableCell>
                  <TableCell>{request.account}</TableCell>
                  <TableCell>{request.facilityName}</TableCell>
                  <TableCell className="font-mono">{request.facilityCode}</TableCell>
                  <TableCell>{request.workplaceName}</TableCell>
                  <TableCell>{request.role}</TableCell>
                  <TableCell>{request.requestedAt}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequest(request.id, "거절")}
                      >
                        거절
                      </Button>
                      <Button size="sm" onClick={() => handleRequest(request.id, "승인")}>
                        승인
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
