import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";
import { AdminHeaderIdentity } from "@/components/admin/admin-header-identity";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex flex-1 items-center justify-between">
            <AdminHeaderIdentity />
          </div>
        </header>
        {children}
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
