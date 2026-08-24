import { notFound } from "next/navigation";

import { FacilityResidentsDashboard } from "@/components/admin/facility-residents-dashboard";
import { CARE_FACILITIES } from "@/lib/statistics-mock";

export function generateStaticParams() {
  return CARE_FACILITIES.map((facility) => ({ id: facility.id }));
}

export default async function FacilityResidentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facility = CARE_FACILITIES.find((item) => item.id === id);
  if (!facility) notFound();
  return <FacilityResidentsDashboard facility={facility} />;
}
