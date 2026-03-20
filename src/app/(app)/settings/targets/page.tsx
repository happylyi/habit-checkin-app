"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getZhErrorMessage } from "@/lib/errors";

type TaskRow = { id: string; name: string; enabled: boolean };
type TargetRow = { task_id: string; daily_target_count: number };

export default function TargetsPage() {
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [targetsByTaskId, setTargetsByTaskId] = useState<
    Record<string, number>
  >({});

  const [draftTargetsByTaskId, setDraftTargetsByTaskId] = useState<
    Record<string, number>
  >({});

  const targetMin = 0;
  const targetMax = 999;

  async function refresh() {
    setErrorText(null);
    setLoading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      setUserId(userData.user?.id ?? null);

      const [tasksRes, targetsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id,name,enabled")
          .eq("enabled", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("task_daily_targets")
          .select("task_id,daily_target_count"),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (targetsRes.error) throw targetsRes.error;

      const tasksRows = (tasksRes.data ?? []) as TaskRow[];
      const targetsRows = (targetsRes.data ?? []) as TargetRow[];

      const tmap: Record<string, number> = {};
      for (const tr of targetsRows) tmap[tr.task_id] = tr.daily_target_count;

      setTasks(tasksRows);
      setTargetsByTaskId(tmap);

      // 初始化 draft：没有 targets 时显示 1（并允许保存时创建）
      const draft: Record<string, number> = {};
      for (const t of tasksRows) draft[t.id] = tmap[t.id] ?? 1;
      setDraftTargetsByTaskId(draft);
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasTasks = tasks.length > 0;
  const targetCountSummary = useMemo(() => {
    const values = Object.values(draftTargetsByTaskId);
    if (values.length === 0) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { avg: Math.round(avg * 10) / 10 };
  }, [draftTargetsByTaskId]);

  async function saveOne(taskId: string) {
    if (!userId) return;
    const value = Number(draftTargetsByTaskId[taskId] ?? 1);
    if (!Number.isFinite(value)) {
      setErrorText("目标值无效，请填写数字。");
      return;
    }
    const clamped = Math.min(targetMax, Math.max(targetMin, Math.floor(value)));

    setErrorText(null);
    setLoading(true);
    try {
      const { error } = await supabase.from("task_daily_targets").upsert(
        {
          user_id: userId,
          task_id: taskId,
          daily_target_count: clamped,
        },
        { onConflict: "user_id,task_id" },
      );

      if (error) throw error;
      await refresh();
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pb-24" data-oid="uk25i48">
      <div className="rounded-2xl bg-white p-4 shadow-sm" data-oid="sj.b9-2">
        <h2 className="text-lg font-semibold" data-oid="_simm8t">
          目标设置（任务每日目标）
        </h2>
        <p className="mt-1 text-sm text-zinc-600" data-oid="xjll--o">
          “任务每日目标达成 streak” 的判定：当某天{" "}
          <span className="font-mono" data-oid="-1hvq1f">
            done_count &gt;= daily_target_count
          </span>{" "}
          时算达标。你可以把{" "}
          <span className="font-mono" data-oid="--mx6fa">
            daily_target_count=0
          </span>{" "}
          视为当天自动达标。
        </p>
        {targetCountSummary ? (
          <div className="mt-2 text-xs text-zinc-500" data-oid="l2p8knd">
            当前任务目标平均值：{targetCountSummary.avg}
          </div>
        ) : null}
      </div>

      <div
        className="mt-3 rounded-2xl bg-white p-4 shadow-sm"
        data-oid="p:2vp6d"
      >
        {loading && !hasTasks ? (
          <div className="text-center text-xs text-zinc-500" data-oid="6.tz.js">
            加载中...
          </div>
        ) : null}
        {!hasTasks && !loading ? (
          <div className="text-center text-sm text-zinc-600" data-oid="c4vu0rk">
            暂无任务。先在“今日打卡”页面添加任务。
          </div>
        ) : null}

        {errorText ? (
          <div
            className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            data-oid="9ncx08e"
          >
            {errorText}
          </div>
        ) : null}

        {tasks.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3" data-oid="0740gqo">
            {tasks.map((t) => {
              const value =
                draftTargetsByTaskId[t.id] ?? targetsByTaskId[t.id] ?? 1;
              return (
                <div
                  key={t.id}
                  className="rounded-2xl border border-zinc-200 p-3"
                  data-oid="qjyft_c"
                >
                  <div
                    className="flex items-start justify-between gap-3"
                    data-oid="rc42irx"
                  >
                    <div data-oid="lmied7y">
                      <div className="text-sm font-semibold" data-oid="-chs4v7">
                        {t.name}
                      </div>
                      <div
                        className="mt-1 text-xs text-zinc-500"
                        data-oid="0xsw.jv"
                      >
                        当前目标：{targetsByTaskId[t.id] ?? 1}
                        （保存后用于“每日目标达成”口径）
                      </div>
                    </div>
                    <div className="flex items-center gap-2" data-oid="cqifve_">
                      <input
                        type="number"
                        min={targetMin}
                        max={targetMax}
                        step={1}
                        value={value}
                        onChange={(e) =>
                          setDraftTargetsByTaskId((prev) => ({
                            ...prev,
                            [t.id]: Number(e.target.value),
                          }))
                        }
                        className="h-10 w-24 rounded-xl border border-zinc-200 bg-white px-2 text-sm outline-none"
                        data-oid="-nn:1mf"
                      />

                      <button
                        type="button"
                        onClick={() => saveOne(t.id)}
                        disabled={loading}
                        className="h-10 rounded-xl bg-zinc-900 px-3 text-sm text-white disabled:opacity-60"
                        data-oid="k:jvp7k"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
