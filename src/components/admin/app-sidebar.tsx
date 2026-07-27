"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  FileText,
  KeyRound,
  LogOut,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GrandFoodMark } from "@/components/brand/grandfood-logo";
import { RESIDENTS } from "@/lib/admin-residents";

const HIGH_RISK_COUNT = RESIDENTS.filter((r) => r.risk === "고위험").length;

const NAV_GROUPS: {
  label: string;
  items: {
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[];
}[] = [
  {
    label: "관리",
    items: [
      { label: "대상자 명단", href: "/admin/residents", icon: UsersRound },
      {
        label: "이상 신호 큐",
        href: "/admin/residents?risk=고위험",
        icon: AlertTriangle,
        badge: HIGH_RISK_COUNT,
      },
      { label: "방문·상담 일지", href: "/admin/visits", icon: ClipboardList },
    ],
  },
  {
    label: "통계",
    items: [
      { label: "지역 건강 지표", href: "/admin/health-stats", icon: BarChart3 },
      { label: "급식 예산 집행", href: "/admin/budget", icon: Wallet },
      { label: "월간 보고서 출력", href: "/admin/reports", icon: FileText },
    ],
  },
  {
    label: "보안",
    items: [
      { label: "접근 감사 로그", href: "/admin/audit-log", icon: ShieldCheck },
      { label: "담당자 권한", href: "/admin/permissions", icon: KeyRound },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <GrandFoodMark className="h-6 w-6 shrink-0 rounded-md" />
          <span className="text-sm font-extrabold text-sidebar-foreground">
            GrandFood
          </span>
          <span className="text-[10px] font-extrabold tracking-[0.1em] text-sidebar-primary">
            GOV ADMIN
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href.split("?")[0];
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
                      {!!item.badge && (
                        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-bold">
                  박
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  박정현 주무관
                </span>
                <span className="truncate text-xs text-sidebar-foreground/60">
                  강남구청 · 노인복지과
                </span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="로그아웃"
              onClick={() => router.push("/admin/login")}
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
