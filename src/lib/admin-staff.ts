export type PermissionRole = "관리자" | "편집자" | "뷰어";

export type StaffMember = {
  id: string;
  name: string;
  title: string;
  role: PermissionRole;
  active: boolean;
  lastLogin: string;
};

export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: "s1",
    name: "박정현",
    title: "주무관",
    role: "관리자",
    active: true,
    lastLogin: "2026.07.27 09:12",
  },
  {
    id: "s2",
    name: "김미정",
    title: "사회복지사",
    role: "편집자",
    active: true,
    lastLogin: "2026.07.26 17:03",
  },
  {
    id: "s3",
    name: "이수정",
    title: "주무관 (신입)",
    role: "뷰어",
    active: true,
    lastLogin: "2026.07.24 10:30",
  },
  {
    id: "s4",
    name: "정해수",
    title: "전 담당자",
    role: "뷰어",
    active: false,
    lastLogin: "2026.03.02 15:40",
  },
];
