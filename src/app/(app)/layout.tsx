import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-[100dvh] bg-zinc-50" data-oid="hji764:">
      <div
        className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur"
        data-oid="7_oz_qg"
      >
        <div
          className="mx-auto flex max-w-md items-center justify-between px-4 py-3"
          data-oid="dv6ijxa"
        >
          <div className="flex items-center gap-2" data-oid="a3odjtw">
            <div className="text-sm font-semibold" data-oid="xr_x0-f">
              每日打卡
            </div>
          </div>
          <SignOutButton data-oid="4mn46eb" />
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 py-4" data-oid="y.wxaa3">
        {children}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 bg-zinc-50"
        data-oid="4w_5v2m"
      >
        <div
          className="mx-auto flex max-w-md items-center justify-between px-4 py-2"
          data-oid="ubdx14w"
        >
          <Link
            className="text-sm text-zinc-700"
            href="/app/dashboard"
            data-oid="gozh85g"
          >
            主页
          </Link>
          <Link
            className="text-sm text-zinc-700"
            href="/app/checkin/today"
            data-oid="zvghm79"
          >
            今日
          </Link>
          <Link
            className="text-sm text-zinc-700"
            href="/app/checkin/calendar"
            data-oid="iiio2b9"
          >
            日历
          </Link>
          <Link
            className="text-sm text-zinc-700"
            href="/app/stats"
            data-oid="0s9tta8"
          >
            统计
          </Link>
          <Link
            className="text-sm text-zinc-700"
            href="/app/history"
            data-oid="z6jqn0l"
          >
            历史
          </Link>
        </div>
      </nav>
    </div>
  );
}
