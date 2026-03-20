"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getZhErrorMessage } from "@/lib/errors";
import { addDays, toDateKey } from "@/lib/date";

type Mode = "habit" | "task";

type HabitRow = { id: string; name: string };
type TaskRow = { id: string; name: string };

type HabitCheckinRow = {
  id: string;
  date: string;
  note: string | null;
  habit_id: string;
};

type TaskCheckinRow = {
  id: string;
  date: string;
  done_count: number;
  note: string | null;
  task_id: string;
};

const PAGE_SIZE = 15;

export default function HistoryPage() {
  const supabase = getSupabaseBrowserClient();

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const defaultFromKey = useMemo(() => addDays(todayKey, -60), [todayKey]);

  const [mode, setMode] = useState<Mode>("habit");
  const [userId, setUserId] = useState<string | null>(null);

  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [habitNameById, setHabitNameById] = useState<Record<string, string>>({});
  const [taskNameById, setTaskNameById] = useState<Record<string, string>>({});

  const [selectedHabitId, setSelectedHabitId] = useState<string>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("all");

  const [filterFromKey, setFilterFromKey] = useState(defaultFromKey);
  const [filterToKey, setFilterToKey] = useState(todayKey);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [habitRecords, setHabitRecords] = useState<HabitCheckinRow[]>([]);
  const [taskRecords, setTaskRecords] = useState<TaskCheckinRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Create/Update form drafts
  const [formDateKey, setFormDateKey] = useState(todayKey);
  const [habitNoteDraft, setHabitNoteDraft] = useState("");
  const [taskDoneDraft, setTaskDoneDraft] = useState<number>(1);
  const [taskNoteDraft, setTaskNoteDraft] = useState("");

  // Inline edit
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editingHabitNoteDraft, setEditingHabitNoteDraft] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskDoneDraft, setEditingTaskDoneDraft] = useState<number>(1);
  const [editingTaskNoteDraft, setEditingTaskNoteDraft] = useState("");

  async function refreshUserAndLists() {
    setErrorText(null);
    setLoading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      setUserId(userData.user?.id ?? null);

      const [habitsRes, tasksRes] = await Promise.all([
        supabase.from("habits").select("id,name").order("created_at", { ascending: true }),
        supabase.from("tasks").select("id,name").eq("enabled", true).order("created_at", { ascending: true }),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const habitsRows = (habitsRes.data ?? []) as HabitRow[];
      const tasksRows = (tasksRes.data ?? []) as TaskRow[];

      setHabits(habitsRows);
      setTasks(tasksRows);

      setHabitNameById(Object.fromEntries(habitsRows.map((h) => [h.id, h.name])));
      setTaskNameById(Object.fromEntries(tasksRows.map((t) => [t.id, t.name])));

      if (habitsRows.length > 0 && selectedHabitId === "all") setSelectedHabitId(habitsRows[0].id);
      if (tasksRows.length > 0 && selectedTaskId === "all") setSelectedTaskId(tasksRows[0].id);
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const todayWithinFilter = useMemo(() => todayKey >= filterFromKey && todayKey <= filterToKey, [todayKey, filterFromKey, filterToKey]);

  useEffect(() => {
    refreshUserAndLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(0);
    setHabitRecords([]);
    setTaskRecords([]);
  }, [mode, filterFromKey, filterToKey, selectedHabitId, selectedTaskId]);

  async function fetchHabitRecords(pageToLoad: number) {
    const from = pageToLoad * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("habit_checkins")
      .select("id,date,note,habit_id")
      .order("date", { ascending: false })
      .gte("date", filterFromKey)
      .lte("date", filterToKey)
      .range(from, to);

    if (selectedHabitId !== "all") q = q.eq("habit_id", selectedHabitId);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as HabitCheckinRow[];
  }

  async function fetchTaskRecords(pageToLoad: number) {
    const from = pageToLoad * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let q = supabase
      .from("task_checkins")
      .select("id,date,done_count,note,task_id")
      .order("date", { ascending: false })
      .gte("date", filterFromKey)
      .lte("date", filterToKey)
      .range(from, to);

    if (selectedTaskId !== "all") q = q.eq("task_id", selectedTaskId);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as TaskCheckinRow[];
  }

  async function refreshRecords() {
    setErrorText(null);
    setLoading(true);
    try {
      if (mode === "habit") {
        const rows = await fetchHabitRecords(page);
        setHabitRecords(rows);
        setHasMore(rows.length === PAGE_SIZE);
      } else {
        const rows = await fetchTaskRecords(page);
        setTaskRecords(rows);
        setHasMore(rows.length === PAGE_SIZE);
      }
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, page, filterFromKey, filterToKey, selectedHabitId, selectedTaskId]);

  const canSubmit = Boolean(userId) && (mode === "habit" ? selectedHabitId !== "all" : selectedTaskId !== "all");

  async function upsertHabitCheckin() {
    if (!userId) return;
    if (selectedHabitId === "all") return;

    const habitId = selectedHabitId;
    const note = habitNoteDraft.trim() || null;

    setErrorText(null);
    setLoading(true);
    try {
      const { data: existing, error: findErr } = await supabase
        .from("habit_checkins")
        .select("id")
        .eq("habit_id", habitId)
        .eq("date", formDateKey)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing?.id) {
        const { error } = await supabase.from("habit_checkins").update({ note }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habit_checkins").insert({
          user_id: userId,
          habit_id: habitId,
          date: formDateKey,
          note,
        });
        if (error) throw error;
      }

      await refreshRecords();
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function upsertTaskCheckin() {
    if (!userId) return;
    if (selectedTaskId === "all") return;

    const taskId = selectedTaskId;
    const doneCount = Number(taskDoneDraft ?? 0);
    const note = taskNoteDraft.trim() || null;

    setErrorText(null);
    setLoading(true);
    try {
      const { data: existing, error: findErr } = await supabase
        .from("task_checkins")
        .select("id")
        .eq("task_id", taskId)
        .eq("date", formDateKey)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing?.id) {
        if (doneCount <= 0) {
          const { error } = await supabase.from("task_checkins").delete().eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("task_checkins")
            .update({ done_count: doneCount, note })
            .eq("id", existing.id);
          if (error) throw error;
        }
      } else {
        if (doneCount > 0) {
          const { error } = await supabase.from("task_checkins").insert({
            user_id: userId,
            task_id: taskId,
            date: formDateKey,
            done_count: doneCount,
            note,
          });
          if (error) throw error;
        }
      }

      await refreshRecords();
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function deleteHabitCheckin(id: string) {
    setErrorText(null);
    setLoading(true);
    try {
      const { error } = await supabase.from("habit_checkins").delete().eq("id", id);
      if (error) throw error;
      await refreshRecords();
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function deleteTaskCheckin(id: string) {
    setErrorText(null);
    setLoading(true);
    try {
      const { error } = await supabase.from("task_checkins").delete().eq("id", id);
      if (error) throw error;
      await refreshRecords();
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function startEditHabit(row: HabitCheckinRow) {
    setEditingHabitId(row.id);
    setEditingHabitNoteDraft(row.note ?? "");
  }

  async function startEditTask(row: TaskCheckinRow) {
    setEditingTaskId(row.id);
    setEditingTaskDoneDraft(row.done_count);
    setEditingTaskNoteDraft(row.note ?? "");
  }

  async function saveEditHabit() {
    if (!editingHabitId) return;
    setErrorText(null);
    setLoading(true);
    try {
      const { error } = await supabase
        .from("habit_checkins")
        .update({ note: editingHabitNoteDraft.trim() || null })
        .eq("id", editingHabitId);
      if (error) throw error;
      setEditingHabitId(null);
      await refreshRecords();
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function saveEditTask() {
    if (!editingTaskId) return;
    setErrorText(null);
    setLoading(true);
    try {
      const doneCount = Number(editingTaskDoneDraft ?? 0);
      if (doneCount <= 0) {
        const { error } = await supabase.from("task_checkins").delete().eq("id", editingTaskId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("task_checkins")
          .update({ done_count: doneCount, note: editingTaskNoteDraft.trim() || null })
          .eq("id", editingTaskId);
        if (error) throw error;
      }
      setEditingTaskId(null);
      await refreshRecords();
    } catch (err) {
      setErrorText(getZhErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pb-24">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">打卡历史（流水增删改查）</h2>
            <p className="mt-1 text-sm text-zinc-600">修改完成后，统计/日历会在下一次进入时同步更新。</p>
          </div>
          <span className="rounded-xl bg-zinc-100 px-3 py-1 text-xs text-zinc-700">CRUD</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("habit")}
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "habit" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            习惯流水
          </button>
          <button
            type="button"
            onClick={() => setMode("task")}
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "task" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
            }`}
          >
            任务流水
          </button>
        </div>

        {errorText ? <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorText}</div> : null}
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {mode === "habit" ? (
            <label className="text-sm text-zinc-600">
              选择习惯
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
              >
                <option value="all">全部</option>
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
                <option value="all">全部</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
            {todayWithinFilter ? "已在筛选范围内" : "今天不在当前筛选范围内"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm text-zinc-600">
            开始日期
            <input
              type="date"
              value={filterFromKey}
              onChange={(e) => setFilterFromKey(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
            />
          </label>
          <label className="text-sm text-zinc-600">
            结束日期
            <input
              type="date"
              value={filterToKey}
              onChange={(e) => setFilterToKey(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
          <div className="text-sm font-semibold">新增/更新（按日期覆盖）</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-sm text-zinc-600">
              日期
              <input
                type="date"
                value={formDateKey}
                onChange={(e) => setFormDateKey(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
              />
            </label>

            {mode === "habit" ? (
              <div className="flex flex-col">
                <span className="text-sm text-zinc-600">备注（可选）</span>
                <input
                  value={habitNoteDraft}
                  onChange={(e) => setHabitNoteDraft(e.target.value)}
                  placeholder="例如：今天进度不错..."
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-sm text-zinc-600">完成次数（0=撤销）</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={taskDoneDraft}
                  onChange={(e) => setTaskDoneDraft(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
                />
              </div>
            )}
          </div>

          {mode === "task" ? (
            <div className="mt-2">
              <label className="text-sm text-zinc-600">
                备注（可选）
                <input
                  value={taskNoteDraft}
                  onChange={(e) => setTaskNoteDraft(e.target.value)}
                  placeholder="补充说明..."
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit || loading}
            onClick={() => (mode === "habit" ? upsertHabitCheckin() : upsertTaskCheckin())}
            className="mt-3 h-11 w-full rounded-xl bg-zinc-900 text-white disabled:opacity-60"
          >
            {mode === "habit" ? "保存习惯流水" : "保存任务流水"}
          </button>

          {!canSubmit ? (
            <div className="mt-2 text-xs text-zinc-600">
              {mode === "habit" ? "请先选择具体习惯（不是全部）" : "请先选择具体任务（不是全部）"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">{mode === "habit" ? "习惯历史列表" : "任务历史列表"}</div>
          <div className="text-xs text-zinc-500">第 {page + 1} 页</div>
        </div>

        {mode === "habit" ? (
          <div className="mt-3 flex flex-col gap-2">
            {habitRecords.length === 0 ? <div className="text-sm text-zinc-600">暂无数据</div> : null}

            {habitRecords.map((row) => {
              const name = habitNameById[row.habit_id] ?? row.habit_id;
              const isEditing = editingHabitId === row.id;
              return (
                <div key={row.id} className="rounded-2xl border border-zinc-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {name} <span className="ml-2 text-xs text-zinc-500">{row.date}</span>
                      </div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
                        {isEditing ? (
                          <input
                            value={editingHabitNoteDraft}
                            onChange={(e) => setEditingHabitNoteDraft(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                          />
                        ) : (
                          row.note ?? "—"
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={saveEditHabit} disabled={loading} className="h-9 rounded-xl bg-zinc-900 px-3 text-xs text-white disabled:opacity-60">
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingHabitId(null)}
                            disabled={loading}
                            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 disabled:opacity-60"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditHabit(row)}
                            disabled={loading}
                            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 disabled:opacity-60"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHabitCheckin(row.id)}
                            disabled={loading}
                            className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs text-red-700 disabled:opacity-60"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {taskRecords.length === 0 ? <div className="text-sm text-zinc-600">暂无数据</div> : null}

            {taskRecords.map((row) => {
              const name = taskNameById[row.task_id] ?? row.task_id;
              const isEditing = editingTaskId === row.id;
              return (
                <div key={row.id} className="rounded-2xl border border-zinc-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {name} <span className="ml-2 text-xs text-zinc-500">{row.date}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-zinc-800">
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={editingTaskDoneDraft}
                              onChange={(e) => setEditingTaskDoneDraft(Number(e.target.value))}
                              className="h-10 w-24 rounded-xl border border-zinc-200 bg-white px-2 text-sm outline-none"
                            />
                          </>
                        ) : (
                          <span>完成：{row.done_count} 次</span>
                        )}
                      </div>

                      <div className="mt-2 text-sm text-zinc-800">
                        {isEditing ? (
                          <input
                            value={editingTaskNoteDraft}
                            onChange={(e) => setEditingTaskNoteDraft(e.target.value)}
                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none"
                          />
                        ) : (
                          <span>{row.note ?? "—"}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button type="button" onClick={saveEditTask} disabled={loading} className="h-9 rounded-xl bg-zinc-900 px-3 text-xs text-white disabled:opacity-60">
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            disabled={loading}
                            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 disabled:opacity-60"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditTask(row)}
                            disabled={loading}
                            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-800 disabled:opacity-60"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTaskCheckin(row.id)}
                            disabled={loading}
                            className="h-9 rounded-xl border border-red-200 bg-red-50 px-3 text-xs text-red-700 disabled:opacity-60"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm disabled:opacity-60"
          >
            上一页
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore || loading}
            className="h-10 rounded-xl bg-zinc-900 px-3 text-sm text-white disabled:opacity-60"
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  );
}


