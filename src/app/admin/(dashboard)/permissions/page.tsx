import { PermissionsView } from "@/components/admin/permissions-view";
import { STAFF_MEMBERS } from "@/lib/admin-staff";

export default function AdminPermissionsPage() {
  return <PermissionsView staff={STAFF_MEMBERS} />;
}
