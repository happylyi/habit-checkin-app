import Link from "next/link";
import { getSupabaseUser } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getSupabaseUser().catch(() => null);

  return (
    <section className="pb-24" data-oid="68ouck6">
      <div className="rounded-2xl bg-white p-4 shadow-sm" data-oid="-phh6ko">
        <div
          className="flex items-start justify-between gap-3"
          data-oid="_9-k37y"
        >
          <div data-oid="tln3_07">
            <h2 className="text-lg font-semibold" data-oid="wpqwote">
              欢迎回来
            </h2>
            <p className="mt-1 text-sm text-zinc-600" data-oid="h-2d8go">
              {user?.email ?? "未获取到邮箱"}
            </p>
          </div>
          <span
            className="rounded-xl bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
            data-oid="spt_j26"
          >
            简约模式
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3" data-oid="cotumor">
          <Link
            href="/app/checkin/today"
            className="rounded-2xl border border-zinc-200 bg-white p-3"
            data-oid="idof4m1"
          >
            <div className="text-sm font-semibold" data-oid="p-nl4e.">
              今日打卡
            </div>
            <div className="mt-1 text-xs text-zinc-600" data-oid="3pnn_sx">
              习惯/任务两种模式
            </div>
          </Link>
          <Link
            href="/app/checkin/calendar"
            className="rounded-2xl border border-zinc-200 bg-white p-3"
            data-oid="bvpzpty"
          >
            <div className="text-sm font-semibold" data-oid="jsxic.2">
              打卡日历
            </div>
            <div className="mt-1 text-xs text-zinc-600" data-oid="i3y.7xh">
              一眼看清完成情况
            </div>
          </Link>
          <Link
            href="/app/stats"
            className="rounded-2xl border border-zinc-200 bg-white p-3"
            data-oid="av:u1_e"
          >
            <div className="text-sm font-semibold" data-oid="1myze7e">
              连续天数
            </div>
            <div className="mt-1 text-xs text-zinc-600" data-oid="_9raovk">
              趋势与统计图表
            </div>
          </Link>
          <Link
            href="/app/history"
            className="rounded-2xl border border-zinc-200 bg-white p-3"
            data-oid="o-_xgu3"
          >
            <div className="text-sm font-semibold" data-oid="uku6u:y">
              打卡历史
            </div>
            <div className="mt-1 text-xs text-zinc-600" data-oid="wksf.oh">
              流水可增删改查
            </div>
          </Link>
        </div>
      </div>

      <div
        className="mt-3 rounded-2xl bg-white p-4 shadow-sm"
        data-oid="fjzz_d-"
      >
        <div className="text-sm font-semibold" data-oid="70-k9a9">
          任务模式目标设置
        </div>
        <p className="mt-1 text-xs text-zinc-600" data-oid="h8w2dop">
          设置每日目标口径后，会影响任务模式的“每日目标达成 streak”。
        </p>
        <div className="mt-3" data-oid="7ov2_gc">
          <Link
            href="/app/settings/targets"
            className="text-sm font-medium text-zinc-900"
            data-oid="-hwmw84"
          >
            去设置
          </Link>
        </div>
      </div>
    </section>
  );
}
