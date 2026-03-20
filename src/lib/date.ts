import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const APP_TIMEZONE = "Asia/Shanghai";

export function toDateKey(d: Date = new Date()) {
  return dayjs(d).tz(APP_TIMEZONE).format("YYYY-MM-DD");
}

export function parseDateKey(dateKey: string) {
  // dateKey 是 'YYYY-MM-DD'，按应用时区解析到当天零点。
  return dayjs.tz(dateKey, "YYYY-MM-DD", APP_TIMEZONE);
}

export function addDays(dateKey: string, days: number) {
  return parseDateKey(dateKey).add(days, "day").format("YYYY-MM-DD");
}

export function monthKey(d: Date = new Date()) {
  return dayjs(d).tz(APP_TIMEZONE).format("YYYY-MM");
}

export function monthStart(dateKeyOrMonthKey: string) {
  // 支持 'YYYY-MM' 或 'YYYY-MM-DD'
  const dk = /^\d{4}-\d{2}$/.test(dateKeyOrMonthKey)
    ? `${dateKeyOrMonthKey}-01`
    : dateKeyOrMonthKey;
  return parseDateKey(dk).startOf("month").format("YYYY-MM-DD");
}

export function monthEnd(dateKeyOrMonthKey: string) {
  const dk = /^\d{4}-\d{2}$/.test(dateKeyOrMonthKey)
    ? `${dateKeyOrMonthKey}-01`
    : dateKeyOrMonthKey;
  return parseDateKey(dk).endOf("month").format("YYYY-MM-DD");
}

export function dayOfWeekMondayFirst(dateKey: string) {
  // 返回 0..6（周一为 0）
  // JS day()：0=周日...6=周六
  const dowSunFirst = parseDateKey(dateKey).day();
  return (dowSunFirst + 6) % 7;
}

