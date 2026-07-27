import { AppSidebar } from "@/components/admin/app-sidebar";
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex flex-1 items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              강남구청 · 노인복지과
            </span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>세션 만료까지 27:41</span>
              <span className="text-foreground">박정현 주무관님, 안녕하세요</span>
            </div>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
