"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  MapPinned,
  ScrollText,
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
  type AdminSession,
  getAdminOrganizationName,
  readAdminSession,
} from "@/lib/admin-auth";

const NAV_ITEMS = [
  { label: "공지사항", href: "/admin/notices", icon: Bell },
  { label: "대상자 명단", href: "/admin/residents", icon: UsersRound },
  { label: "통합 모니터링", href: "/admin/statistics", icon: ChartNoAxesCombined },
  { label: "통합 모니터링 2", href: "/admin/statistics-empty", icon: ChartNoAxesCombined },
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
  const canReviewSignups =
    isSuperAdmin || session?.accessLevel === "MUNICIPALITY_ADMIN";
  const canUseMapMonitoring =
    isSuperAdmin ||
    session?.accessLevel === "MUNICIPALITY_ADMIN";
  const managementPath = isSuperAdmin
    ? "/admin/dashboard?section=registration"
    : "/admin/dashboard?section=approvals";
  const homePath = "/admin/statistics";
  const organizationName = getAdminOrganizationName(session);

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
          className="flex items-center gap-2 overflow-hidden rounded-md px-2 py-1.5 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <GrandFoodMark className="h-6 w-6 shrink-0 rounded-md" />
          {/* 사이드바를 접으면(collapsible=icon) 글자를 숨겨 로고만 남긴다 — 안 숨기면
              글자가 좁아진 폭을 밀고 나가 접기/펴기 토글 버튼을 가려서 다시 펼치기가
              어려워진다. 이 셀렉터는 sidebar.tsx가 SidebarMenuSub 등에서 쓰는 것과 같다. */}
          <span className="text-sm font-extrabold whitespace-nowrap text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            GrandFood
          </span>
          <span className="text-[10px] font-extrabold tracking-[0.1em] whitespace-nowrap text-sidebar-primary group-data-[collapsible=icon]:hidden">
            {isSuperAdmin ? "SUPER ADMIN" : "GOV ADMIN"}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/admin/residents"
                    ? pathname.startsWith(item.href)
                    : pathname === item.href;
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
                    {item.href === "/admin/statistics" &&
                      pathname.startsWith("/admin/statistics") &&
                      !pathname.startsWith("/admin/statistics-empty") && (
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === "/admin/statistics"}
                              render={<Link href="/admin/statistics" />}
                            >
                              <ChartNoAxesCombined />
                              <span>현황 대시보드</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          {canUseMapMonitoring && <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === "/admin/statistics/map"}
                              render={<Link href="/admin/statistics/map" />}
                            >
                              <MapPinned />
                              <span>지도 모니터링</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>}
                        </SidebarMenuSub>
                      )}
                    {item.href === "/admin/statistics-empty" &&
                      pathname.startsWith("/admin/statistics-empty") && (
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === "/admin/statistics-empty"}
                              render={<Link href="/admin/statistics-empty" />}
                            >
                              <ChartNoAxesCombined />
                              <span>현황 대시보드</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          {canUseMapMonitoring && <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === "/admin/statistics-empty/map"}
                              render={<Link href="/admin/statistics-empty/map" />}
                            >
                              <MapPinned />
                              <span>지도 모니터링</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>}
                        </SidebarMenuSub>
                      )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {session && canReviewSignups && (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/admin/dashboard")}
                tooltip="관리"
                render={<Link href={managementPath} />}
              >
                <LayoutDashboard />
                <span>관리</span>
              </SidebarMenuButton>
              {pathname.startsWith("/admin/dashboard") && (
                <SidebarMenuSub>
                  {isSuperAdmin && (
                    <>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          render={<Link href="/admin/dashboard?section=registration" />}
                        >
                          <span>지자체 및 계정 등록</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          render={<Link href="/admin/dashboard?section=care-facilities" />}
                        >
                          <span>산하시설 등록</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </>
                  )}
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
          {isSuperAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/admin/access-logs")}
                tooltip="기록"
                render={<Link href="/admin/access-logs/logins" />}
              >
                <ScrollText />
                <span>기록</span>
              </SidebarMenuButton>
              {pathname.startsWith("/admin/access-logs") && (
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      isActive={pathname === "/admin/access-logs/logins"}
                      render={<Link href="/admin/access-logs/logins" />}
                    >
                      <span>로그인 기록</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      isActive={pathname === "/admin/access-logs/views"}
                      render={<Link href="/admin/access-logs/views" />}
                    >
                      <span>개인정보 열람기록</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 overflow-hidden px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-bold">
                  {(session?.account ?? "관리자").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* 헤더 로고와 같은 이유로, 접었을 때는 아바타만 남기고 계정 정보를 숨긴다. */}
              <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {session?.account ?? "관리자"}
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  {isSuperAdmin
                    ? "GrandFood · 최종관리자"
                    : `${organizationName} · ${session?.role ?? "담당자"}`}
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
