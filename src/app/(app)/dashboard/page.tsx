import Link from "next/link";
import { getSupabaseUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getSupabaseUser().catch(() => null);

  return (
    <section className="pb-24">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">欢迎回来</h2>
            <p className="mt-1 text-sm text-zinc-600">{user?.email ?? "未获取到邮箱"}</p>
          </div>
          <span className="rounded-xl bg-zinc-100 px-3 py-1 text-xs text-zinc-700">简约模式</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/app/checkin/today" className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="text-sm font-semibold">今日打卡</div>
            <div className="mt-1 text-xs text-zinc-600">习惯/任务两种模式</div>
          </Link>
          <Link href="/app/checkin/calendar" className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="text-sm font-semibold">打卡日历</div>
            <div className="mt-1 text-xs text-zinc-600">一眼看清完成情况</div>
          </Link>
          <Link href="/app/stats" className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="text-sm font-semibold">连续天数</div>
            <div className="mt-1 text-xs text-zinc-600">趋势与统计图表</div>
          </Link>
          <Link href="/app/history" className="rounded-2xl border border-zinc-200 bg-white p-3">
            <div className="text-sm font-semibold">打卡历史</div>
            <div className="mt-1 text-xs text-zinc-600">流水可增删改查</div>
          </Link>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold">任务模式目标设置</div>
        <p className="mt-1 text-xs text-zinc-600">设置每日目标口径后，会影响任务模式的“每日目标达成 streak”。</p>
        <div className="mt-3">
          <Link href="/app/settings/targets" className="text-sm font-medium text-zinc-900">
            去设置
          </Link>
        </div>
      </div>
    </section>
  );
}

