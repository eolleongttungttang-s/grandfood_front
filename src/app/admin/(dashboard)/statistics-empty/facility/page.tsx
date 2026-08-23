import { Suspense } from "react";

import { DatabaseFacilityResidentsDashboard } from "@/components/admin/database-facility-residents-dashboard";

export default function DatabaseFacilityResidentsPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">시설 대상자를 불러오는 중입니다.</main>}>
      <DatabaseFacilityResidentsDashboard />
    </Suspense>
  );
}
