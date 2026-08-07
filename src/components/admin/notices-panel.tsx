"use client";

import { useEffect, useState } from "react";
import { Bell, Megaphone, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readAdminSession } from "@/lib/admin-auth";
import { getJson, postJson } from "@/lib/api";

type Notice = {
  notice_id: string;
  facility_id: string | null;
  facility_name: string | null;
  title: string;
  content: string;
  created_at: string;
};

type NoticeFacility = {
  facilityId: string;
  facilityName: string;
};

type FacilityApiResponse = {
  facility_id: string;
  name: string;
};

export function NoticesPanel() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [availableFacilities, setAvailableFacilities] = useState<NoticeFacility[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const session = readAdminSession();
      const superAdmin = session?.accessLevel === "SUPER_ADMIN";
      const sessionFacilityId = session?.facilityId || null;
      setIsSuperAdmin(superAdmin);
      setFacilityId(sessionFacilityId);
      setFacilityName(session?.facilityName || null);

      if (superAdmin) {
        void getJson<FacilityApiResponse[]>("/api/admin/facilities")
          .then((rows) =>
            setAvailableFacilities(
              rows.map((facility) => ({
                facilityId: facility.facility_id,
                facilityName: facility.name,
              })),
            ),
          )
          .catch(() => toast.error("기관 목록을 불러오지 못했습니다."));
      }

      if (!superAdmin && !sessionFacilityId) {
        setNotices([]);
        setLoading(false);
        toast.error("로그인 계정에 소속 기관 정보가 없습니다.");
        return;
      }

      const noticePath = !superAdmin && sessionFacilityId
        ? `/gov/notices?facility_id=${encodeURIComponent(sessionFacilityId)}`
        : "/gov/notices";
      void getJson<Notice[]>(noticePath)
        .then(setNotices)
        .catch((error) =>
          toast.error(error instanceof Error ? error.message : "공지사항을 불러오지 못했습니다."),
        )
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialogOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dialogOpen]);

  async function createNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSuperAdmin && !facilityId) {
      toast.error("소속 기관이 확인되지 않아 공지를 등록할 수 없습니다.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const targetFacilityId = isSuperAdmin
      ? String(form.get("noticeFacility") ?? "")
      : facilityId ?? "";

    setSubmitting(true);
    try {
      const created = await postJson<Notice>("/gov/notices", {
        title: String(form.get("noticeTitle") ?? "").trim(),
        content: String(form.get("noticeContent") ?? "").trim(),
        facility_id: targetFacilityId || null,
      });
      setNotices((current) => [created, ...current]);
      setDialogOpen(false);
      toast.success("공지사항을 등록했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "공지사항 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">공지사항</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            기관 운영에 필요한 최신 공지를 확인합니다.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus /> 공지 등록
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> 최근 공지
          </CardTitle>
          <CardDescription>등록된 공지를 최신순으로 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              공지사항을 불러오는 중입니다.
            </p>
          )}
          {!loading && notices.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              등록된 공지사항이 없습니다.
            </p>
          )}
          {notices.map((notice) => (
            <article key={notice.notice_id} className="rounded-xl border p-4 transition-colors hover:bg-muted/40">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{notice.title}</h3>
                  <Badge variant={notice.facility_id ? "secondary" : "default"}>
                    {notice.facility_name ?? "전체"}
                  </Badge>
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
                    new Date(notice.created_at),
                  )}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {notice.content}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialogOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-dialog-title"
            className="w-full max-w-xl rounded-2xl bg-background shadow-2xl"
          >
            <header className="flex items-start justify-between border-b p-5">
              <div>
                <h2 id="notice-dialog-title" className="flex items-center gap-2 text-lg font-bold">
                  <Megaphone className="h-5 w-5 text-primary" /> 공지사항 등록
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  전체 기관 또는 특정 기관에 전달할 공지를 작성합니다.
                </p>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="닫기" onClick={() => setDialogOpen(false)}>
                <X />
              </Button>
            </header>
            <form className="space-y-4 p-5" onSubmit={createNotice}>
              {isSuperAdmin ? (
                <div className="space-y-2">
                  <Label htmlFor="noticeFacility">공지 대상</Label>
                  <select
                    id="noticeFacility"
                    name="noticeFacility"
                    defaultValue=""
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">전체 기관</option>
                    {availableFacilities.map((facility) => (
                      <option key={facility.facilityId} value={facility.facilityId}>
                        {facility.facilityName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                  공지 대상: <strong>{facilityName ?? "소속 기관"}</strong>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="noticeTitle">제목</Label>
                <Input id="noticeTitle" name="noticeTitle" maxLength={200} autoFocus required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="noticeContent">내용</Label>
                <Textarea id="noticeContent" name="noticeContent" className="min-h-36" maxLength={4000} required />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={submitting}>
                  <Send /> {submitting ? "등록 중..." : "등록"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
