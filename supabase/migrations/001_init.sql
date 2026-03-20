-- Habit/Task Check-in App: 初始数据库结构与 RLS 策略
-- 执行方式：把该文件内容复制到 Supabase SQL Editor 执行一次即可。

begin;

-- 用于 gen_random_uuid()
create extension if not exists pgcrypto;

-- 基础用户资料（可选字段：时区等）
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now()
);

-- 习惯定义
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

-- 任务定义
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- 习惯打卡流水（存在即完成）
create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_checkins_unique unique (user_id, habit_id, date)
);

-- 任务打卡流水：one per day per task（done_count 可编辑，用于每日目标达成）
create table if not exists public.task_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  date date not null,
  done_count integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_checkins_unique unique (user_id, task_id, date),
  constraint task_checkins_done_count_nonneg check (done_count >= 0)
);

-- 任务每日目标：用于“每日目标达成 streak”
create table if not exists public.task_daily_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  daily_target_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_daily_targets_unique unique (user_id, task_id),
  constraint task_daily_targets_daily_target_count_nonneg check (daily_target_count >= 0)
);

-- updated_at 通用触发器
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_habit_checkins_updated_at on public.habit_checkins;
create trigger trg_habit_checkins_updated_at
before update on public.habit_checkins
for each row execute function public.set_updated_at();

drop trigger if exists trg_task_checkins_updated_at on public.task_checkins;
create trigger trg_task_checkins_updated_at
before update on public.task_checkins
for each row execute function public.set_updated_at();

drop trigger if exists trg_task_daily_targets_updated_at on public.task_daily_targets;
create trigger trg_task_daily_targets_updated_at
before update on public.task_daily_targets
for each row execute function public.set_updated_at();

-- 新用户注册后自动创建 profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, timezone)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    coalesce(new.raw_user_meta_data->>'timezone', 'Asia/Shanghai')
  )
  on conflict (user_id) do update
  set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    timezone = coalesce(excluded.timezone, public.profiles.timezone);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================
-- RLS：只允许用户访问自己的数据
-- =========================

-- profiles
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
for select
using (user_id = auth.uid());

create policy "profiles_insert_own" on public.profiles
for insert
with check (user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- habits
alter table public.habits enable row level security;

create policy "habits_select_own" on public.habits
for select using (user_id = auth.uid());

create policy "habits_insert_own" on public.habits
for insert with check (user_id = auth.uid());

create policy "habits_update_own" on public.habits
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "habits_delete_own" on public.habits
for delete using (user_id = auth.uid());

-- tasks
alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
for select using (user_id = auth.uid());

create policy "tasks_insert_own" on public.tasks
for insert with check (user_id = auth.uid());

create policy "tasks_update_own" on public.tasks
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "tasks_delete_own" on public.tasks
for delete using (user_id = auth.uid());

-- habit_checkins：保证 habit_id 属于当前用户
alter table public.habit_checkins enable row level security;

create policy "habit_checkins_select_own" on public.habit_checkins
for select using (user_id = auth.uid());

create policy "habit_checkins_insert_own" on public.habit_checkins
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.habits h
    where h.id = habit_checkins.habit_id
      and h.user_id = auth.uid()
  )
);

create policy "habit_checkins_update_own" on public.habit_checkins
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.habits h
    where h.id = habit_checkins.habit_id
      and h.user_id = auth.uid()
  )
);

create policy "habit_checkins_delete_own" on public.habit_checkins
for delete using (user_id = auth.uid());

-- task_checkins：保证 task_id 属于当前用户
alter table public.task_checkins enable row level security;

create policy "task_checkins_select_own" on public.task_checkins
for select using (user_id = auth.uid());

create policy "task_checkins_insert_own" on public.task_checkins
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_checkins.task_id
      and t.user_id = auth.uid()
  )
);

create policy "task_checkins_update_own" on public.task_checkins
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_checkins.task_id
      and t.user_id = auth.uid()
  )
);

create policy "task_checkins_delete_own" on public.task_checkins
for delete using (user_id = auth.uid());

-- task_daily_targets：保证 task_id 属于当前用户
alter table public.task_daily_targets enable row level security;

create policy "task_daily_targets_select_own" on public.task_daily_targets
for select using (user_id = auth.uid());

create policy "task_daily_targets_insert_own" on public.task_daily_targets
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_daily_targets.task_id
      and t.user_id = auth.uid()
  )
);

create policy "task_daily_targets_update_own" on public.task_daily_targets
for update
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_daily_targets.task_id
      and t.user_id = auth.uid()
  )
);

create policy "task_daily_targets_delete_own" on public.task_daily_targets
for delete using (user_id = auth.uid());

commit;

