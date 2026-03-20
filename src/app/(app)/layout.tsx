import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-[100dvh] bg-zinc-50">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">每日打卡</div>
          </div>
          <SignOutButton />
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <Link className="text-sm text-zinc-700" href="/app/dashboard">
            主页
          </Link>
          <Link className="text-sm text-zinc-700" href="/app/checkin/today">
            今日
          </Link>
          <Link className="text-sm text-zinc-700" href="/app/checkin/calendar">
            日历
          </Link>
          <Link className="text-sm text-zinc-700" href="/app/stats">
            统计
          </Link>
          <Link className="text-sm text-zinc-700" href="/app/history">
            历史
          </Link>
        </div>
      </nav>
    </div>
  );
}

