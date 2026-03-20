"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getZhErrorMessage } from "@/lib/errors";

dayjs.extend(utc);
dayjs.extend(timezone);

type Mode = "habit" | "task";

type HabitRow = {
  id: string;
  name: string;
  color: string | null;
};

type HabitCheckinRow = {
  habit_id: string;
  note: string | null;
};

type TaskRow = {
  id: string;
  name: string;
  enabled: boolean;
};

type TaskCheckinRow = {
  task_id: string;
  done_count: number;
  note: string | null;
};

type TaskTargetRow = {
  task_id: string;
  daily_target_count: number;
};

export default function TodayCheckinPage() {
  const supabase = getSupabaseBrowserClient();

  const todayKey = useMemo(() => {
    return dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD");
  }, []);

  const [mode, setMode] = useState<Mode>("habit");
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);

  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [habitCheckinsByHabitId, setHabitCheckinsByHabitId] = useState<
    Record<string, HabitCheckinRow>
  >({});

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskCheckinsByTaskId, setTaskCheckinsByTaskId] = useState<
    Record<string, TaskCheckinRow>
  >({});
  const [targetsByTaskId, setTargetsByTaskId] = useState<
    Record<string, TaskTargetRow>
  >({});

  // drafts for editing notes/counts
  const [habitNoteDraft, setHabitNoteDraft] = useState<Record<string, string>>(
    {},
  );
  const [taskDoneDraft, setTaskDoneDraft] = useState<Record<string, number>>(
    {},
  );
  const [taskNoteDraft, setTaskNoteDraft] = useState<Record<string, string>>(
    {},
  );

  const [creatingHabitName, setCreatingHabitName] = useState("");
  const [creatingTaskName, setCreatingTaskName] = useState("");

  async function refresh() {
    setErrorText(null);
    setLoading(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      setUserId(userData.user?.id ?? null);
      const today = todayKey;

      const [
        habitsRes,
        habitCheckinsRes,
        tasksRes,
        taskCheckinsRes,
        targetsRes,
      ] = await Promise.all([
        supabase
          .from("habits")
          .select("id,name,color")
          .order("created_at", { ascending: true }),
        supabase
          .from("habit_checkins")
          .select("habit_id,note")
          .eq("date", today),
        supabase
          .from("tasks")
          .select("id,name,enabled")
          .order("created_at", { ascending: true }),
        supabase
          .from("task_checkins")
          .select("task_id,done_count,note")
          .eq("date", today),
        supabase
          .from("task_daily_targets")
          .select("task_id,daily_target_count"),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (habitCheckinsRes.error) throw habitCheckinsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (taskCheckinsRes.error) throw taskCheckinsRes.error;
      if (targetsRes.error) throw targetsRes.error;

      const habitsRows = (habitsRes.data ?? []) as HabitRow[];
      const habitCheckinsRows = (habitCheckinsRes.data ??
        []) as HabitCheckinRow[];
      const tasksRows = (tasksRes.data ?? []) as TaskRow[];
      const taskCheckinsRows = (taskCheckinsRes.data ?? []) as TaskCheckinRow[];
      const targetsRows = (targetsRes.data ?? []) as TaskTargetRow[];

      const habitMap: Record<string, HabitCheckinRow> = {};
      for (const r of habitCheckinsRows) habitMap[r.habit_id] = r;

      const taskMap: Record<string, TaskCheckinRow> = {};
      for (const r of taskCheckinsRows) taskMap[r.task_id] = r;

      const targetMap: Record<string, TaskTargetRow> = {};
      for (const r of targetsRows) targetMap[r.task_id] = r;

      setHabits(habitsRows);
      setHabitCheckinsByHabitId(habitMap);

      setTasks(tasksRows.filter((t) => t.enabled));
      setTaskCheckinsByTaskId(taskMap);
      setTargetsByTaskId(targetMap);

      // init drafts
      const nextHabitDraft: Record<string, string> = {};
      for (const h of habitsRows)
        nextHabitDraft[h.id] = habitMap[h.id]?.note ?? "";
      setHabitNoteDraft(nextHabitDraft);

      const nextTaskDoneDraft: Record<string, number> = {};
      const nextTaskNoteDraft: Record<string, string> = {};
      for (const t of tasksRows) {
        if (!t.enabled) continue;
        nextTaskDoneDraft[t.id] = taskMap[t.id]?.done_count ?? 1;
        nextTaskNoteDraft[t.id] = taskMap[t.id]?.note ?? "";
      }
      setTaskDoneDraft(nextTaskDoneDraft);
      setTaskNoteDraft(nextTaskNoteDraft);
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  async function createHabit() {
    if (!userId) return;
    const name = creatingHabitName.trim();
    if (!name) return;
    setErrorText(null);

    const { error } = await supabase.from("habits").insert({
      user_id: userId,
      name,
      color: null,
    });

    if (error) {
      setErrorText(getZhErrorMessage(error));
      return;
    }

    setCreatingHabitName("");
    await refresh();
  }

  async function createTask() {
    if (!userId) return;
    const name = creatingTaskName.trim();
    if (!name) return;
    setErrorText(null);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        name,
        enabled: true,
      })
      .select("id")
      .single();

    if (error) {
      setErrorText(getZhErrorMessage(error));
      return;
    }

    // 创建后默认 daily_target_count = 1（可在“目标设置”页改）
    const taskId = (data as { id?: string } | null)?.id;
    if (taskId) {
      const { error: targetErr } = await supabase
        .from("task_daily_targets")
        .upsert(
          {
            user_id: userId,
            task_id: taskId,
            daily_target_count: 1,
          },
          { onConflict: "user_id,task_id" },
        );

      if (targetErr) {
        setErrorText(getZhErrorMessage(targetErr));
        // 不中断，允许用户先完成打卡
      }
    }

    setCreatingTaskName("");
    await refresh();
  }

  async function toggleHabit(habitId: string, shouldCheckIn: boolean) {
    if (!userId) return;
    setErrorText(null);

    const note = habitNoteDraft[habitId] ?? "";
    const today = todayKey;

    if (shouldCheckIn) {
      const exists = Boolean(habitCheckinsByHabitId[habitId]);
      if (exists) {
        const { error } = await supabase
          .from("habit_checkins")
          .update({ note })
          .eq("user_id", userId)
          .eq("habit_id", habitId)
          .eq("date", today);

        if (error) setErrorText(getZhErrorMessage(error));
      } else {
        const { error } = await supabase.from("habit_checkins").insert({
          user_id: userId,
          habit_id: habitId,
          date: today,
          note,
        });
        if (error) setErrorText(getZhErrorMessage(error));
      }
    } else {
      const { error } = await supabase
        .from("habit_checkins")
        .delete()
        .eq("user_id", userId)
        .eq("habit_id", habitId)
        .eq("date", today);
      if (error) setErrorText(getZhErrorMessage(error));
    }

    await refresh();
  }

  async function saveTask(taskId: string) {
    if (!userId) return;
    setErrorText(null);

    const today = todayKey;
    const doneCount = Number(taskDoneDraft[taskId] ?? 0);
    const note = taskNoteDraft[taskId] ?? "";

    if (doneCount <= 0) {
      const { error } = await supabase
        .from("task_checkins")
        .delete()
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .eq("date", today);
      if (error) setErrorText(getZhErrorMessage(error));
      await refresh();
      return;
    }

    const exists = Boolean(taskCheckinsByTaskId[taskId]);
    if (exists) {
      const { error } = await supabase
        .from("task_checkins")
        .update({ done_count: doneCount, note })
        .eq("user_id", userId)
        .eq("task_id", taskId)
        .eq("date", today);
      if (error) setErrorText(getZhErrorMessage(error));
    } else {
      const { error } = await supabase.from("task_checkins").insert({
        user_id: userId,
        task_id: taskId,
        date: today,
        done_count: doneCount,
        note,
      });
      if (error) setErrorText(getZhErrorMessage(error));
    }

    await refresh();
  }

  async function undoTask(taskId: string) {
    if (!userId) return;
    setErrorText(null);
    const today = todayKey;
    const { error } = await supabase
      .from("task_checkins")
      .delete()
      .eq("user_id", userId)
      .eq("task_id", taskId)
      .eq("date", today);
    if (error) setErrorText(getZhErrorMessage(error));
    await refresh();
  }

  const habitCount = habits.length;
  const taskCount = tasks.length;

  return (
    <section className="pb-24" data-oid="ipop67i">
      <div className="rounded-2xl bg-white p-4 shadow-sm" data-oid="fnbnrt.">
        <div
          className="flex items-start justify-between gap-4"
          data-oid="1y23n-j"
        >
          <div data-oid="-..5znd">
            <h2 className="text-lg font-semibold" data-oid="vvh6.jd">
              今日打卡
            </h2>
            <p className="mt-1 text-sm text-zinc-600" data-oid="18gdkak">
              {todayKey}（本地时区 Asia/Shanghai）
            </p>
          </div>
          <div className="flex gap-2" data-oid="x.:hnlc">
            <button
              type="button"
              onClick={() => setMode("habit")}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === "habit"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-800"
              }`}
              data-oid="y_aiwbg"
            >
              习惯
              <span className="ml-1 text-xs text-white/90" data-oid="e45uiod">
                {mode === "habit" ? `(${habitCount})` : ""}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("task")}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === "task"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-800"
              }`}
              data-oid="zk0yx58"
            >
              任务
              <span className="ml-1 text-xs text-white/90" data-oid="6kf_yoc">
                {mode === "task" ? `(${taskCount})` : ""}
              </span>
            </button>
          </div>
        </div>

        {errorText ? (
          <div
            className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            data-oid="0z7p563"
          >
            {errorText}
          </div>
        ) : null}
      </div>

      <div
        className="mt-3 rounded-2xl bg-white p-4 shadow-sm"
        data-oid="g3zb6s4"
      >
        {mode === "habit" ? (
          <>
            <div
              className="flex items-center justify-between"
              data-oid="c7z1v72"
            >
              <h3 className="text-sm font-semibold" data-oid="071fcy-">
                习惯打卡
              </h3>
            </div>

            <div className="mt-3 flex items-center gap-2" data-oid="2g9csc5">
              <input
                value={creatingHabitName}
                onChange={(e) => setCreatingHabitName(e.target.value)}
                placeholder="添加一个习惯（例如：跑步）"
                className="h-10 flex-1 rounded-xl border border-zinc-200 px-3 outline-none focus:border-zinc-300"
                data-oid="xp2tkjy"
              />

              <button
                type="button"
                onClick={createHabit}
                disabled={loading || !creatingHabitName.trim()}
                className="h-10 rounded-xl bg-zinc-900 px-3 text-sm text-white disabled:opacity-60"
                data-oid="ofkvkr0"
              >
                添加
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3" data-oid="rdk-2od">
              {habits.length === 0 ? (
                <div className="text-sm text-zinc-600" data-oid="j3lj.mo">
                  暂无习惯。先添加一个吧。
                </div>
              ) : null}

              {habits.map((h) => {
                const checked = Boolean(habitCheckinsByHabitId[h.id]);
                const noteDraft = habitNoteDraft[h.id] ?? "";
                return (
                  <div
                    key={h.id}
                    className="rounded-2xl border border-zinc-200 p-3"
                    data-oid="p05_dvm"
                  >
                    <div
                      className="flex items-start justify-between gap-3"
                      data-oid="-uplkmv"
                    >
                      <div data-oid="3-l_.2_">
                        <div
                          className="flex items-center gap-2"
                          data-oid="hbx3iv."
                        >
                          <div
                            className="h-3.5 w-3.5 rounded-full"
                            style={{ backgroundColor: h.color ?? "#71717a" }}
                            data-oid="ebtf6qd"
                          />

                          <div
                            className="text-sm font-semibold"
                            data-oid="r8mo.tb"
                          >
                            {h.name}
                          </div>
                        </div>
                        <div
                          className="mt-1 text-xs text-zinc-500"
                          data-oid="yxbdkpf"
                        >
                          {checked ? "已完成" : "未完成"}
                        </div>
                      </div>
                      <div className="flex gap-2" data-oid="1dba1xa">
                        {checked ? (
                          <button
                            type="button"
                            onClick={() => toggleHabit(h.id, false)}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800"
                            data-oid="-dvih6:"
                          >
                            撤销
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleHabit(h.id, true)}
                            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs text-white"
                            data-oid="i..lwnu"
                          >
                            打卡
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3" data-oid=":7fpi-:">
                      <label
                        className="text-xs text-zinc-600"
                        data-oid="mkb2ilb"
                      >
                        备注（可选）
                      </label>
                      <textarea
                        value={noteDraft}
                        onChange={(e) =>
                          setHabitNoteDraft((prev) => ({
                            ...prev,
                            [h.id]: e.target.value,
                          }))
                        }
                        placeholder="写下今天的感受/计划..."
                        className="mt-1 h-20 w-full resize-none rounded-xl border border-zinc-200 p-2 text-sm outline-none focus:border-zinc-300"
                        data-oid="45jeysp"
                      />

                      <button
                        type="button"
                        onClick={() => toggleHabit(h.id, true)}
                        disabled={loading}
                        className="mt-2 w-full rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-800 disabled:opacity-60"
                        data-oid="uqii89q"
                      >
                        {checked ? "保存备注" : "打卡并保存"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div
              className="flex items-center justify-between"
              data-oid="mle8euo"
            >
              <h3 className="text-sm font-semibold" data-oid="mmgu2jk">
                任务打卡
              </h3>
            </div>

            <div className="mt-3 flex items-center gap-2" data-oid="yvy2:hh">
              <input
                value={creatingTaskName}
                onChange={(e) => setCreatingTaskName(e.target.value)}
                placeholder="添加一个任务（例如：阅读）"
                className="h-10 flex-1 rounded-xl border border-zinc-200 px-3 outline-none focus:border-zinc-300"
                data-oid="z2v8m9t"
              />

              <button
                type="button"
                onClick={createTask}
                disabled={loading || !creatingTaskName.trim()}
                className="h-10 rounded-xl bg-zinc-900 px-3 text-sm text-white disabled:opacity-60"
                data-oid=".o.ym.p"
              >
                添加
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3" data-oid="wu0aoky">
              {tasks.length === 0 ? (
                <div className="text-sm text-zinc-600" data-oid="yhzeydf">
                  暂无任务。先添加一个吧。
                </div>
              ) : null}

              {tasks.map((t) => {
                const checked = Boolean(taskCheckinsByTaskId[t.id]);
                const doneDraft = taskDoneDraft[t.id] ?? 1;
                const noteDraft = taskNoteDraft[t.id] ?? "";
                const target = targetsByTaskId[t.id]?.daily_target_count ?? 1;

                const reached = checked && doneDraft >= target;

                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-zinc-200 p-3"
                    data-oid="g_o3yiz"
                  >
                    <div
                      className="flex items-start justify-between gap-3"
                      data-oid="_eqcvjw"
                    >
                      <div data-oid="8al_4fr">
                        <div
                          className="text-sm font-semibold"
                          data-oid="wnbqlpl"
                        >
                          {t.name}
                        </div>
                        <div
                          className="mt-1 text-xs text-zinc-500"
                          data-oid="5jjjmtr"
                        >
                          目标：至少 {target} 次 / 达成：
                          {reached ? "是" : checked ? "否" : "未打卡"}
                        </div>
                      </div>

                      <div className="flex gap-2" data-oid="ojtzz68">
                        {checked ? (
                          <button
                            type="button"
                            onClick={() => undoTask(t.id)}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-800"
                            data-oid="u9:ftdj"
                          >
                            撤销
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => saveTask(t.id)}
                            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs text-white"
                            data-oid="j-5nvvt"
                          >
                            打卡
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className="mt-3 grid grid-cols-2 gap-2"
                      data-oid="dt74dui"
                    >
                      <label
                        className="text-xs text-zinc-600"
                        data-oid="-2h7u0b"
                      >
                        完成次数
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={doneDraft}
                          onChange={(e) =>
                            setTaskDoneDraft((prev) => ({
                              ...prev,
                              [t.id]: Number(e.target.value),
                            }))
                          }
                          className="mt-1 h-10 w-full rounded-xl border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-300"
                          data-oid="g:-k.xn"
                        />
                      </label>
                      <div
                        className="flex items-end justify-end"
                        data-oid="jl75sju"
                      >
                        <div
                          className="text-xs text-zinc-500"
                          data-oid="m13:ob1"
                        >
                          {checked ? "已存在今日记录" : "将创建今日记录"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3" data-oid="0rpkqgn">
                      <label
                        className="text-xs text-zinc-600"
                        data-oid="3cd_tbn"
                      >
                        备注（可选）
                      </label>
                      <textarea
                        value={noteDraft}
                        onChange={(e) =>
                          setTaskNoteDraft((prev) => ({
                            ...prev,
                            [t.id]: e.target.value,
                          }))
                        }
                        placeholder="补充说明..."
                        className="mt-1 h-16 w-full resize-none rounded-xl border border-zinc-200 p-2 text-sm outline-none focus:border-zinc-300"
                        data-oid="-ribnym"
                      />

                      <button
                        type="button"
                        onClick={() => saveTask(t.id)}
                        disabled={loading}
                        className="mt-2 w-full rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-800 disabled:opacity-60"
                        data-oid="snuft3r"
                      >
                        {checked ? "保存更新" : "打卡并保存"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div
          className="mt-4 text-center text-xs text-zinc-500"
          data-oid="22xnx93"
        >
          加载中...
        </div>
      ) : null}
    </section>
  );
}
