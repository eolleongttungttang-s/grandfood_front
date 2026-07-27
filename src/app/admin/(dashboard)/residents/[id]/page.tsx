import { notFound } from "next/navigation";

import { ResidentDetailView } from "@/components/admin/resident-detail-view";
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
  if (!resident) notFound();

  const detail = getResidentDetail(resident);

  return <ResidentDetailView resident={resident} detail={detail} />;
}
