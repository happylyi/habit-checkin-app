"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { BarChart } from "@/components/BarChart";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getZhErrorMessage } from "@/lib/errors";
import {
  addDays,
  monthKey as getMonthKey,
  toDateKey,
} from "@/lib/date";
import { computeLastNDays, computeMonthCompletionRate, computeStreak } from "@/lib/streak";

type Mode = "habit" | "task";
type TaskRule = "single" | "dailyTarget";

type HabitRow = { id: string; name: string };
type TaskRow = { id: string; name: string; enabled: boolean };
type HabitCheckinRow = { date: string };
type TaskCheckinRow = { date: string; done_count: number };

export default function StatsPage() {
  const supabase = getSupabaseBrowserClient();

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const thisMonthKey = useMemo(() => getMonthKey(new Date()), []);

  const [mode, setMode] = useState<Mode>("habit");
  const [taskRule, setTaskRule] = useState<TaskRule>("dailyTarget");

  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [selectedHabitId, setSelectedHabitId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const [habitDoneSet, setHabitDoneSet] = useState<Set<string>>(new Set());
  const [taskCheckinsByDate, setTaskCheckinsByDate] = useState<Record<string, TaskCheckinRow>>({});
  const [taskDailyTargetCount, setTaskDailyTargetCount] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const rangeStartKey = useMemo(() => addDays(todayKey, -200), [todayKey]);

  async function refreshLists() {
    setErrorText(null);
    setLoading(true);
    try {
      const [habitsRes, tasksRes] = await Promise.all([
        supabase.from("habits").select("id,name").order("created_at", { ascending: true }),
        supabase.from("tasks").select("id,name,enabled").order("created_at", { ascending: true }),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const habitsRows = (habitsRes.data ?? []) as HabitRow[];
      const tasksRows = (tasksRes.data ?? []) as TaskRow[];

      setHabits(habitsRows);
      setTasks(tasksRows.filter((t) => t.enabled));

      if (!selectedHabitId && habitsRows.length > 0) setSelectedHabitId(habitsRows[0].id);
      if (!selectedTaskId && tasksRows.length > 0) setSelectedTaskId(tasksRows[0].id);
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function refreshStreakData() {
    if (mode === "habit") {
      if (!selectedHabitId) return;
      setLoading(true);
      setErrorText(null);

      try {
        const { data, error } = await supabase
          .from("habit_checkins")
          .select("date")
          .eq("habit_id", selectedHabitId)
          .gte("date", rangeStartKey)
          .lte("date", todayKey);

        if (error) throw error;

        const rows = (data ?? []) as HabitCheckinRow[];
        const done = new Set(rows.map((r) => r.date));
        setHabitDoneSet(done);
      } catch (err) {
        setErrorText(getZhErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!selectedTaskId) return;
    setLoading(true);
    setErrorText(null);

    try {
      const targetRes = await supabase
        .from("task_daily_targets")
        .select("daily_target_count")
        .eq("task_id", selectedTaskId)
        .maybeSingle();
      if (targetRes.error) throw targetRes.error;
      setTaskDailyTargetCount((targetRes.data?.daily_target_count ?? 1) as number);

      const { data, error } = await supabase
        .from("task_checkins")
        .select("date,done_count")
        .eq("task_id", selectedTaskId)
        .gte("date", rangeStartKey)
        .lte("date", todayKey);
      if (error) throw error;

      const rows = (data ?? []) as TaskCheckinRow[];
      const map: Record<string, TaskCheckinRow> = {};
      for (const r of rows) map[r.date] = r;
      setTaskCheckinsByDate(map);
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshStreakData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedHabitId, selectedTaskId, rangeStartKey, todayKey, taskRule, thisMonthKey]);

  const isComplete = useCallback(
    (dateKey: string) => {
      if (mode === "habit") return habitDoneSet.has(dateKey);
      const row = taskCheckinsByDate[dateKey];
      if (!row) return false;
      if (taskRule === "single") return row.done_count > 0;
      return row.done_count >= taskDailyTargetCount;
    },
    [mode, habitDoneSet, taskCheckinsByDate, taskRule, taskDailyTargetCount]
  );

  const currentStreak = useMemo(() => computeStreak(todayKey, isComplete), [todayKey, isComplete]);

  const monthCompletion = useMemo(
    () =>
      computeMonthCompletionRate({
        monthKey: thisMonthKey,
        isComplete,
      }),
    [thisMonthKey, isComplete]
  );

  const last14Keys = useMemo(() => computeLastNDays({ endDateKey: todayKey, n: 14 }), [todayKey]);

  const chartData = useMemo(() => {
    return last14Keys.map((dk) => {
      const value =
        mode === "habit"
          ? isComplete(dk)
            ? 1
            : 0
          : taskRule === "dailyTarget"
            ? isComplete(dk)
              ? 1
              : 0
            : taskCheckinsByDate[dk]?.done_count ?? 0;

      const label = dk.slice(5);
      const tooltip =
        mode === "habit"
          ? `${label}：${value === 1 ? "已完成" : "未完成"}`
          : taskRule === "dailyTarget"
            ? `${label}：${value === 1 ? "达标" : "未达标"}（次数 ${taskCheckinsByDate[dk]?.done_count ?? 0}）`
            : `${label}：完成次数 ${taskCheckinsByDate[dk]?.done_count ?? 0}`;

      return { label, value, tooltip };
    });
  }, [last14Keys, mode, taskRule, isComplete, taskCheckinsByDate]);

  return (
    <section className="pb-24">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">统计与连续天数</h2>
            <p className="mt-1 text-sm text-zinc-600">口径：习惯按“单项完成”；任务支持“单项”或“每日目标”。</p>
          </div>
          <span className="rounded-xl bg-zinc-100 px-3 py-1 text-xs text-zinc-700">{mode === "habit" ? "习惯统计" : "任务统计"}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("habit")}
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "habit" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            习惯
          </button>
          <button
            type="button"
            onClick={() => setMode("task")}
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "task" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            任务
          </button>

          {mode === "task" ? (
            <>
              <button
                type="button"
                onClick={() => setTaskRule("single")}
                className={`rounded-xl px-3 py-2 text-sm ${
                  taskRule === "single" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                }`}
              >
                单项达成
              </button>
              <button
                type="button"
                onClick={() => setTaskRule("dailyTarget")}
                className={`rounded-xl px-3 py-2 text-sm ${
                  taskRule === "dailyTarget" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
                }`}
              >
                每日目标达成
              </button>
            </>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {mode === "habit" ? (
            <label className="text-sm text-zinc-600">
              选择习惯
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
              >
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-sm text-zinc-600">
              选择任务
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
            {mode === "task" && taskRule === "dailyTarget" ? (
              <>每日目标：至少 {taskDailyTargetCount} 次</>
            ) : (
              <>连续天数截止到今天</>
            )}
          </div>
        </div>

        {errorText ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorText}</div> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">当前连续</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-900">{currentStreak} 天</div>
          <div className="mt-1 text-xs text-zinc-500">按当前统计口径计算</div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">本月完成率</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-900">
            {Math.round(monthCompletion.rate * 100)}%
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {monthCompletion.completedDays}/{monthCompletion.totalDays} 天
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">最近 14 天</div>
            <div className="mt-1 text-xs text-zinc-500">用柱状图展示完成/达成状态</div>
          </div>
          <div className="text-xs text-zinc-500">{mode === "task" ? (taskRule === "dailyTarget" ? "达标(0/1)" : "完成次数") : "完成(0/1)"}</div>
        </div>

        <div className="mt-2 rounded-2xl bg-zinc-50 p-2">
          <BarChart data={chartData} height={140} />
        </div>
      </div>

      {loading ? <div className="mt-3 text-center text-xs text-zinc-500">加载中...</div> : null}
    </section>
  );
}


