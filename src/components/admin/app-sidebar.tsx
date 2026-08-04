"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  UsersRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GrandFoodMark } from "@/components/brand/grandfood-logo";
import {
  ADMIN_SESSION_KEY,
  AdminSession,
  readAdminSession,
} from "@/lib/admin-auth";

const NAV_ITEMS = [
  { label: "대상자 명단", href: "/admin/residents", icon: UsersRound },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSession(readAdminSession()), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const isSuperAdmin = session?.accessLevel === "SUPER_ADMIN";
  const homePath = "/admin/dashboard?section=registration";

  function handleLogout() {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    router.replace("/admin/login");
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          href={homePath}
          aria-label="관리자 홈으로 이동"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <GrandFoodMark className="h-6 w-6 shrink-0 rounded-md" />
          <span className="text-sm font-extrabold text-sidebar-foreground">
            GrandFood
          </span>
          <span className="text-[10px] font-extrabold tracking-[0.1em] text-sidebar-primary">
            {isSuperAdmin ? "SUPER ADMIN" : "GOV ADMIN"}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {session && (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/admin/dashboard")}
                tooltip="관리"
                render={<Link href="/admin/dashboard?section=registration" />}
              >
                <LayoutDashboard />
                <span>관리</span>
              </SidebarMenuButton>
              {pathname.startsWith("/admin/dashboard") && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<Link href="/admin/dashboard?section=registration" />}
                    >
                      <span>등록</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<Link href="/admin/dashboard?section=approvals" />}
                    >
                      <span>담당자 등록</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-bold">
                  {(session?.account ?? "관리자").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {session?.account ?? "관리자"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {isSuperAdmin
                    ? "GrandFood · 최종관리자"
                    : `${session?.facilityName ?? "지자체"} · ${
                        session?.role ?? "담당자"
                      }`}
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="로그아웃"
              onClick={handleLogout}
            >
              <LogOut />
              <span>로그아웃</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
