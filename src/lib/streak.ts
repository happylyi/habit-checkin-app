import { addDays, parseDateKey } from "@/lib/date";

/**
 * 通用：从 endDateKey 往过去计算连续达成天数。
 * isComplete：给定日期 key，返回该天是否算达成。
 */
export function computeStreak(endDateKey: string, isComplete: (dateKey: string) => boolean) {
  let streak = 0;
  let cursor = endDateKey;
  while (isComplete(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeMonthCompletionRate(opts: {
  monthKey: string; // YYYY-MM
  isComplete: (dateKey: string) => boolean;
}) {
  const { monthKey, isComplete } = opts;
  const start = `${monthKey}-01`;
  const end = parseDateKey(start).endOf("month").format("YYYY-MM-DD");

  let total = 0;
  let complete = 0;
  let cursor = start;
  while (cursor <= end) {
    total += 1;
    if (isComplete(cursor)) complete += 1;
    cursor = addDays(cursor, 1);
  }
  const rate = total === 0 ? 0 : complete / total;
  return { totalDays: total, completedDays: complete, rate };
}

export function computeLastNDays(opts: { endDateKey: string; n: number }) {
  const { endDateKey, n } = opts;
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(addDays(endDateKey, -i));
  }
  return result;
}

