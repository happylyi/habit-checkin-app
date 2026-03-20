# Supabase 初始化（SQL）

## 部署前准备
1. 在 Supabase 控制台创建项目后，打开 `SQL Editor`
2. 需要启用扩展时，会自动 `create extension pgcrypto`（用于 `gen_random_uuid()`）

## 执行初始化脚本

把以下文件内容复制到 `SQL Editor` 中执行一次即可：

- `supabase/migrations/001_init.sql`

该脚本会创建：
- `profiles`（用户资料，可选：用于时区等）
- `habits`（习惯）
- `tasks`（任务）
- `habit_checkins`（习惯打卡流水）
- `task_checkins`（任务打卡流水：`done_count` 可编辑）
- `task_daily_targets`（任务每日目标：`daily_target_count`）
- 触发器：`updated_at` 自动更新时间
- 触发器：新用户注册后自动创建 `profiles`
- RLS 策略：严格隔离到 `auth.uid()` 作用域，防止越权访问/篡改他人数据

## 回滚

如果需要回滚，把以下文件内容复制到 `SQL Editor` 执行：

- `supabase/migrations/001_rollback.sql`

回滚会删除本次创建的表与触发器，请确认不会影响线上数据。

