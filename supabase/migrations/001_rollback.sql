-- 回滚脚本（删除本次创建的表与触发器）
-- 执行前请确认没有使用中的数据。

begin;

drop trigger if exists trg_habit_checkins_updated_at on public.habit_checkins;
drop trigger if exists trg_task_checkins_updated_at on public.task_checkins;
drop trigger if exists trg_task_daily_targets_updated_at on public.task_daily_targets;

drop function if exists public.set_updated_at();
drop function if exists public.handle_new_user();

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.task_daily_targets;
drop table if exists public.task_checkins;
drop table if exists public.task_daily_targets;
drop table if exists public.habit_checkins;

drop table if exists public.tasks;
drop table if exists public.habits;
drop table if exists public.profiles;

commit;

