import { ResidentDetailPageClient } from "@/components/admin/resident-detail-page-client";
import { getResidentDetail } from "@/lib/admin-resident-detail";
import { RESIDENTS } from "@/lib/admin-residents";

export function generateStaticParams() {
  return RESIDENTS.map((r) => ({ id: r.id }));
}

export default async function AdminResidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resident = RESIDENTS.find((r) => r.id === id);

  return (
    <ResidentDetailPageClient
      residentId={id}
      initialResident={resident ?? null}
      initialDetail={resident ? getResidentDetail(resident) : null}
    />
  );
}
