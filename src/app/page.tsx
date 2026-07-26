export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">
          Grand Food
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          간단한 Next.js 페이지입니다.
        </p>
      </main>
    </div>
  );
}
