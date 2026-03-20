"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getZhErrorMessage } from "@/lib/errors";
import {
  dayOfWeekMondayFirst,
  monthEnd,
  monthKey as getMonthKey,
  monthStart,
  parseDateKey,
  toDateKey,
} from "@/lib/date";
import { BarChart } from "@/components/BarChart";

type Mode = "habit" | "task";
type TaskRule = "single" | "dailyTarget";

type HabitRow = { id: string; name: string; color: string | null };
type TaskRow = { id: string; name: string; enabled: boolean };
type HabitCheckinRow = { date: string; note: string | null };
type TaskCheckinRow = { date: string; done_count: number; note: string | null };

export default function CalendarPage() {
  const supabase = getSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("habit");
  const [taskRule, setTaskRule] = useState<TaskRule>("dailyTarget");

  const [errorText, setErrorText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [monthKey, setMonthKey] = useState(() => getMonthKey(new Date()));

  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [selectedHabitId, setSelectedHabitId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  const [habitCheckinsByDate, setHabitCheckinsByDate] = useState<
    Record<string, HabitCheckinRow>
  >({});
  const [taskCheckinsByDate, setTaskCheckinsByDate] = useState<
    Record<string, TaskCheckinRow>
  >({});
  const [taskDailyTargetCount, setTaskDailyTargetCount] = useState<number>(1);

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  const monthStartKey = useMemo(() => monthStart(monthKey), [monthKey]);
  const monthEndKey = useMemo(() => monthEnd(monthKey), [monthKey]);
  const daysInView = useMemo(() => {
    const start = parseDateKey(monthStartKey);
    const end = parseDateKey(monthEndKey);
    const result: string[] = [];
    let cursor = start;
    // 避免依赖 dayjs isSameOrBefore 插件（类型/运行时兼容性更好）
    while (cursor.valueOf() <= end.valueOf()) {
      result.push(cursor.format("YYYY-MM-DD"));
      cursor = cursor.add(1, "day");
    }
    return result;
  }, [monthStartKey, monthEndKey]);

  async function refreshListsAndSelection() {
    setErrorText(null);
    setLoading(true);

    try {
      const [habitsRes, tasksRes] = await Promise.all([
        supabase
          .from("habits")
          .select("id,name,color")
          .order("created_at", { ascending: true }),
        supabase
          .from("tasks")
          .select("id,name,enabled")
          .order("created_at", { ascending: true }),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const habitsRows = (habitsRes.data ?? []) as HabitRow[];
      const tasksRows = (tasksRes.data ?? []) as TaskRow[];

      setHabits(habitsRows);
      setTasks(tasksRows.filter((t) => t.enabled));

      if (!selectedHabitId && habitsRows.length > 0)
        setSelectedHabitId(habitsRows[0].id);
      if (!selectedTaskId && tasksRows.length > 0)
        setSelectedTaskId(tasksRows[0].id);
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function refreshCheckins() {
    if (mode === "habit") {
      if (!selectedHabitId) return;
      setLoading(true);
      setErrorText(null);
      try {
        const { data, error } = await supabase
          .from("habit_checkins")
          .select("date,note")
          .eq("habit_id", selectedHabitId)
          .gte("date", monthStartKey)
          .lte("date", monthEndKey);
        if (error) throw error;

        const rows = (data ?? []) as Array<{
          date: string;
          note: string | null;
        }>;
        const map: Record<string, HabitCheckinRow> = {};
        for (const r of rows) {
          map[r.date] = { date: r.date, note: r.note };
        }
        setHabitCheckinsByDate(map);
      } catch (err) {
        setErrorText(getZhErrorMessage(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    // task mode
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
      const targetCount = (targetRes.data?.daily_target_count ?? 1) as number;
      setTaskDailyTargetCount(targetCount);

      const { data, error } = await supabase
        .from("task_checkins")
        .select("date,done_count,note")
        .eq("task_id", selectedTaskId)
        .gte("date", monthStartKey)
        .lte("date", monthEndKey);

      if (error) throw error;

      const rows = (data ?? []) as Array<{
        date: string;
        done_count: number;
        note: string | null;
      }>;
      const map: Record<string, TaskCheckinRow> = {};
      for (const r of rows) {
        map[r.date] = { date: r.date, done_count: r.done_count, note: r.note };
      }
      setTaskCheckinsByDate(map);
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshListsAndSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshCheckins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedHabitId, selectedTaskId, monthKey, taskRule]);

  const leadingEmptyCells = useMemo(
    () => dayOfWeekMondayFirst(monthStartKey),
    [monthStartKey],
  );

  const completionForDate = (dateKey: string) => {
    if (mode === "habit") {
      return Boolean(habitCheckinsByDate[dateKey]);
    }
    const row = taskCheckinsByDate[dateKey];
    if (!row) return false;
    if (taskRule === "single") return row.done_count > 0;
    return row.done_count >= taskDailyTargetCount;
  };

  const selectedDetail = useMemo(() => {
    if (mode === "habit") {
      return habitCheckinsByDate[selectedDateKey] ?? null;
    }
    return taskCheckinsByDate[selectedDateKey] ?? null;
  }, [habitCheckinsByDate, taskCheckinsByDate, selectedDateKey, mode]);

  const chartData = useMemo(() => {
    const data = daysInView.map((dk) => {
      if (!completionForDate(dk))
        return { label: dk.slice(5), value: 0, tooltip: dk };
      if (mode === "habit")
        return { label: dk.slice(5), value: 1, tooltip: dk };
      const row = taskCheckinsByDate[dk];
      const v = row?.done_count ?? 0;
      return {
        label: dk.slice(5),
        value:
          taskRule === "dailyTarget" ? (v >= taskDailyTargetCount ? 1 : 0) : v,
        tooltip: dk,
      };
    });
    // 为了不铺满 UI，只取最后 14 天的分布（类似小图表）
    return data.slice(Math.max(0, data.length - 14));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    daysInView,
    mode,
    taskRule,
    taskDailyTargetCount,
    habitCheckinsByDate,
    taskCheckinsByDate,
    selectedDateKey,
  ]);

  return (
    <section className="pb-24" data-oid="uh30-ic">
      <div className="rounded-2xl bg-white p-4 shadow-sm" data-oid="epzs4po">
        <div
          className="flex items-start justify-between gap-4"
          data-oid="5kwbdzl"
        >
          <div data-oid="90ixkco">
            <h2 className="text-lg font-semibold" data-oid="3j2jhzh">
              打卡日历
            </h2>
            <p className="mt-1 text-sm text-zinc-600" data-oid=".qe4svy">
              以本地时区{" "}
              <span className="font-medium text-zinc-800" data-oid="ciyac2.">
                {dayjs.tz.guess() ?? "Asia/Shanghai"}
              </span>{" "}
              归档（使用固定时区计算）。
            </p>
          </div>
          <span
            className="rounded-xl bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
            data-oid="jppp6.-"
          >
            {mode === "habit" ? "习惯视图" : "任务视图"}
          </span>
        </div>

        <div
          className="mt-3 flex flex-wrap items-center gap-2"
          data-oid="2a0-w_1"
        >
          <button
            type="button"
            onClick={() => setMode("habit")}
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "habit"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-800"
            }`}
            data-oid="ld:qtbr"
          >
            习惯
          </button>
          <button
            type="button"
            onClick={() => setMode("task")}
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "task"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-800"
            }`}
            data-oid="ai8iplg"
          >
            任务
          </button>

          {mode === "task" ? (
            <>
              <button
                type="button"
                onClick={() => setTaskRule("single")}
                className={`rounded-xl px-3 py-2 text-sm ${
                  taskRule === "single"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}
                data-oid="iavkq3."
              >
                单项达成
              </button>
              <button
                type="button"
                onClick={() => setTaskRule("dailyTarget")}
                className={`rounded-xl px-3 py-2 text-sm ${
                  taskRule === "dailyTarget"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}
                data-oid="rpiyrpk"
              >
                每日目标达成
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        className="mt-3 rounded-2xl bg-white p-4 shadow-sm"
        data-oid="ct94_oe"
      >
        <div
          className="flex items-center justify-between gap-3"
          data-oid="2i3oy9_"
        >
          <div className="text-sm font-semibold" data-oid="8w-y9u0">
            月份
          </div>
          <div className="flex items-center gap-2" data-oid="442nscs">
            <button
              type="button"
              onClick={() =>
                setMonthKey(
                  dayjs(`${monthKey}-01`)
                    .subtract(1, "month")
                    .format("YYYY-MM"),
                )
              }
              className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
              data-oid="irx:4jn"
            >
              上月
            </button>
            <div
              className="min-w-[110px] text-center text-sm font-medium"
              data-oid="nafbyhb"
            >
              {monthKey}
            </div>
            <button
              type="button"
              onClick={() =>
                setMonthKey(
                  dayjs(`${monthKey}-01`).add(1, "month").format("YYYY-MM"),
                )
              }
              className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm"
              data-oid="1tv7dqc"
            >
              下月
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2" data-oid="597-anx">
          {mode === "habit" ? (
            <label className="text-sm text-zinc-600" data-oid="w1p1-db">
              选择习惯
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
                data-oid="p_xh763"
              >
                {habits.map((h) => (
                  <option key={h.id} value={h.id} data-oid="qffva_1">
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-sm text-zinc-600" data-oid="7yoxzuz">
              选择任务
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
                data-oid="463__nm"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id} data-oid="9ub8e22">
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div
            className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600"
            data-oid="_gfjppu"
          >
            {mode === "task" && taskRule === "dailyTarget" ? (
              <>每日目标：至少 {taskDailyTargetCount} 次</>
            ) : (
              <>点击日期查看详情</>
            )}
          </div>
        </div>

        {errorText ? (
          <div
            className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            data-oid="ks37mvv"
          >
            {errorText}
          </div>
        ) : null}

        <div className="mt-4" data-oid="5q0suhr">
          <div
            className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500"
            data-oid="o-ln5t4"
          >
            {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
              <div key={w} data-oid="krb8vnd">
                {w}
              </div>
            ))}
          </div>

          <div
            className="mt-2 grid grid-cols-7 gap-1 text-center"
            data-oid="_v3tji5"
          >
            {Array.from({ length: leadingEmptyCells }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-10" data-oid="ja8dhm7" />
            ))}
            {daysInView.map((dk) => {
              const done = completionForDate(dk);
              const isSelected = dk === selectedDateKey;
              const isToday = dk === todayKey;
              const cellStyle = done ? "bg-emerald-600" : "bg-zinc-100";
              return (
                <button
                  key={dk}
                  type="button"
                  onClick={() => setSelectedDateKey(dk)}
                  className={`relative h-10 rounded-xl border border-zinc-200 ${
                    isSelected ? "ring-2 ring-zinc-900" : ""
                  }`}
                  data-oid="6waxntn"
                >
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    data-oid="piej4f0"
                  >
                    <div
                      className={`flex items-center justify-center rounded-lg px-1 text-[12px] ${done ? "text-white" : "text-zinc-700"}`}
                      data-oid=".ktd18."
                    >
                      {Number(dk.slice(-2))}
                    </div>
                  </div>
                  <div
                    className="absolute bottom-1 left-1 right-1 flex items-center justify-center"
                    data-oid="0mip77e"
                  >
                    {done ? (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${cellStyle}`}
                        data-oid="mtd8ad_"
                      />
                    ) : (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-zinc-300"
                        data-oid="xsp6u0."
                      />
                    )}
                  </div>
                  {isToday ? (
                    <div
                      className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-amber-500"
                      data-oid="lndn:4s"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
          data-oid=".dkw1x1"
        >
          <div
            className="flex items-start justify-between gap-3"
            data-oid="b6v60eh"
          >
            <div data-oid="i2.bblm">
              <div className="text-sm font-semibold" data-oid="aaknf_s">
                {selectedDateKey}
              </div>
              <div className="mt-1 text-xs text-zinc-600" data-oid="uk99kzm">
                {mode === "habit" ? "习惯当天是否完成" : "任务当天完成情况"}
              </div>
            </div>
            <div
              className={`rounded-xl px-3 py-1 text-xs ${completionForDate(selectedDateKey) ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-700"}`}
              data-oid="m4.4mrf"
            >
              {completionForDate(selectedDateKey) ? "达成" : "未达成"}
            </div>
          </div>

          {mode === "habit" ? (
            <div className="mt-3 text-sm text-zinc-800" data-oid="xrarkct">
              <div className="text-xs text-zinc-500" data-oid="6ewwaqu">
                备注
              </div>
              <div className="mt-1 whitespace-pre-wrap" data-oid="7drl_ii">
                {(selectedDetail as HabitCheckinRow | null)?.note ?? "—"}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-zinc-800" data-oid="asjzvsw">
              <div className="text-xs text-zinc-500" data-oid="hjdsra_">
                完成次数
              </div>
              <div className="mt-1" data-oid=":ws0y89">
                {(selectedDetail as TaskCheckinRow | null)?.done_count ?? 0} 次
              </div>
              <div className="mt-2 text-xs text-zinc-500" data-oid="dtn8hb7">
                备注
              </div>
              <div className="mt-1 whitespace-pre-wrap" data-oid="tenr9f7">
                {(selectedDetail as TaskCheckinRow | null)?.note ?? "—"}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4" data-oid="-h6-mz1">
          <div className="text-sm font-semibold" data-oid="1mvuq3o">
            最近 14 天小图表
          </div>
          <div className="mt-2 rounded-2xl bg-white p-2" data-oid="q14dyl3">
            <BarChart
              data={chartData.map((d) => ({
                label: d.label,
                value: d.value,
                tooltip: d.tooltip,
              }))}
              height={120}
              data-oid="24t5hpa"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="mt-3 text-center text-xs text-zinc-500"
          data-oid="-gt1skl"
        >
          加载中...
        </div>
      ) : null}
    </section>
  );
}
