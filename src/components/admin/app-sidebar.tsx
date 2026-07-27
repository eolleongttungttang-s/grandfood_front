"use client";

import { useRouter } from "next/navigation";
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

export function AppSidebar({
  highRiskCount,
  onShowHighRisk,
}: {
  highRiskCount: number;
  onShowHighRisk: () => void;
}) {
  const router = useRouter();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="text-sm font-extrabold text-sidebar-foreground">
            GrandFood
          </span>
          <span className="text-[10px] font-extrabold tracking-[0.1em] text-sidebar-primary">
            GOV ADMIN
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>관리</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="대상자 명단">
                  <UsersRound />
                  <span>대상자 명단</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="이상 신호 큐"
                  onClick={onShowHighRisk}
                >
                  <AlertTriangle />
                  <span>이상 신호 큐</span>
                </SidebarMenuButton>
                {highRiskCount > 0 && (
                  <SidebarMenuBadge>{highRiskCount}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="방문·상담 일지 (준비 중)"
                  disabled
                  className="opacity-50"
                >
                  <ClipboardList />
                  <span>방문·상담 일지</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>통계</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="지역 건강 지표 (준비 중)"
                  disabled
                  className="opacity-50"
                >
                  <BarChart3 />
                  <span>지역 건강 지표</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="급식 예산 집행 (준비 중)"
                  disabled
                  className="opacity-50"
                >
                  <Wallet />
                  <span>급식 예산 집행</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="월간 보고서 출력 (준비 중)"
                  disabled
                  className="opacity-50"
                >
                  <FileText />
                  <span>월간 보고서 출력</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>보안</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="접근 감사 로그 (준비 중)"
                  disabled
                  className="opacity-50"
                >
                  <ShieldCheck />
                  <span>접근 감사 로그</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="담당자 권한 (준비 중)"
                  disabled
                  className="opacity-50"
                >
                  <KeyRound />
                  <span>담당자 권한</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
