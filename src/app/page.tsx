import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GrandFoodMark } from "@/components/brand/grandfood-logo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
      <main className="flex flex-col items-center gap-4">
        <GrandFoodMark className="h-14 w-14" />
        <h1 className="text-3xl font-semibold text-foreground">GrandFood</h1>
        <p className="text-muted-foreground">간단한 Next.js 페이지입니다.</p>
        <Button size="lg" className="mt-2" render={<Link href="/admin/login" />}>
          기관 담당자 로그인
        </Button>
      </main>
    </div>
  );
}
