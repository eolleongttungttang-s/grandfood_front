"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPinned, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Resident,
  RESIDENTS,
  RESIDENTS_STORAGE_KEY,
} from "@/lib/admin-residents";
import { AdminSession, readAdminSession } from "@/lib/admin-auth";

type RegionStat = {
  region: string;
  total: number;
};

function getResidentRegion(resident: Resident) {
  const address = resident.address?.trim();
  if (!address) return resident.dong || "지역 미지정";

  const parts = address.split(/\s+/).filter(Boolean);
  const district = parts.find((part) => /[시군구]$/.test(part));
  const neighborhood = parts.find((part) => /[읍면동]$/.test(part));
  return neighborhood ?? district ?? parts[0] ?? "지역 미지정";
}

export function StatisticsDashboard() {
  const [residents, setResidents] = useState<Resident[]>(RESIDENTS);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSession(readAdminSession());
      setSessionLoaded(true);
      const saved = window.localStorage.getItem(RESIDENTS_STORAGE_KEY);
      if (!saved) return;

      try {
        const registeredResidents = JSON.parse(saved) as Resident[];
        setResidents([...RESIDENTS, ...registeredResidents]);
      } catch {
        window.localStorage.removeItem(RESIDENTS_STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const visibleResidents = useMemo(() => {
    if (session?.accessLevel === "SUPER_ADMIN") return residents;
    if (!session?.facilityCode) return [];
    return residents.filter(
      (resident) => resident.facilityCode === session.facilityCode,
    );
  }, [residents, session]);

  const regionStats = useMemo(() => {
    const grouped = new Map<string, RegionStat>();

    for (const resident of visibleResidents) {
      const region = getResidentRegion(resident);
      const current = grouped.get(region) ?? {
        region,
        total: 0,
      };
      current.total += 1;
      grouped.set(region, current);
    }

    return [...grouped.values()].sort(
      (a, b) => b.total - a.total || a.region.localeCompare(b.region, "ko"),
    );
  }, [visibleResidents]);

  if (!sessionLoaded) {
    return (
      <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
        <PageHeader title="대상자 지역 통계" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            권한별 통계를 불러오는 중입니다.
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <PageHeader
        title="대상자 지역 통계"
        description={
          session?.accessLevel === "SUPER_ADMIN"
            ? "전체 지자체의 지역별 관리 대상자 현황입니다."
            : `${session?.facilityName ?? "소속 지자체"}의 관리 대상자 현황입니다.`
        }
      />

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "전체 관리 대상자", value: visibleResidents.length, unit: "명", icon: UsersRound },
          { label: "관리 지역", value: regionStats.length, unit: "곳", icon: MapPinned },
        ].map(({ label, value, unit, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {value.toLocaleString()}
                  <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>지역별 관리 대상자</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {regionStats.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              등록된 대상자가 없습니다.
            </p>
          ) : (
            regionStats.map((item) => {
              const percentage = visibleResidents.length
                ? Math.round((item.total / visibleResidents.length) * 100)
                : 0;
              return (
                <div key={item.region} className="space-y-2 rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{item.region}</p>
                      <p className="text-sm text-muted-foreground">
                        전체 대상자의 {percentage}%
                      </p>
                    </div>
                    <p className="text-xl font-extrabold">{item.total}명</p>
                  </div>
                  <Progress value={percentage} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </main>
  );
}
