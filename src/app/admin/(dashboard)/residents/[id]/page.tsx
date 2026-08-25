import { ResidentDetailPageClient } from "@/components/admin/resident-detail-page-client";
import { getResidentDetail } from "@/lib/admin-resident-detail";
import { createDemoResident, DEMO_RESIDENT_ID, RESIDENTS } from "@/lib/admin-residents";

export function generateStaticParams() {
  return RESIDENTS.map((r) => ({ id: r.id }));
}

export default async function AdminResidentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ facilityCode?: string; facilityName?: string }>;
}) {
  const { id } = await params;
  const { facilityCode, facilityName } = await searchParams;
  const resident = id === DEMO_RESIDENT_ID
    ? createDemoResident({ facilityCode, facilityName })
    : RESIDENTS.find((r) => r.id === id);

  return (
    <ResidentDetailPageClient
      residentId={id}
      initialResident={resident ?? null}
      initialDetail={resident ? getResidentDetail(resident) : null}
    />
  );
}
