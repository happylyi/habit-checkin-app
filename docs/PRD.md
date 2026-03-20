# 每日打卡 APP PRD（习惯/任务）

## 1. 目标与范围
本产品是一个“每日打卡”网页应用，支持两种打卡模式：
1) `习惯打卡`：每一天对某个习惯是否完成，记录一次“完成”流水（可编辑备注，可撤销）。
2) `任务打卡`：每一天对某个任务记录一次流水，包含 `done_count`（完成次数，可编辑与撤销）。

用户可通过日历、连续天数、统计图表查看历史表现，并可在历史页对打卡流水进行增删改查。

## 2. 连续天数口径（关键规则）

### 2.1 习惯（单项 streak）
- 当天是否算“完成”：存在 `habit_checkins` 记录即算完成。
- 连续天数：从“截止日（今日）”向过去回溯，遇到第一天未完成即停止。

### 2.2 任务（双口径 + 可切换）
任务提供两种 streak 计算方式（在“日历/统计”页可切换）：
1) `单项达成`：当某天存在任务流水且 `done_count > 0` 即算达成。
2) `每日目标达成`：当某天存在任务流水且 `done_count >= daily_target_count` 即算达成。

`daily_target_count` 来自 `task_daily_targets` 表；若用户尚未设置目标，则在前端按默认值 `1` 展示并参与统计（后续可通过“目标设置页”初始化/调整）。

## 3. 用户流程
1. 注册/登录（邮箱 + 密码）
2. 进入受保护的 App 区域
3. 今日打卡页完成/撤销打卡（含备注与次数编辑）
4. 日历页按月查看完成情况与流水备注/次数
5. 统计页查看连续天数与最近天数图表
6. 历史页对打卡流水执行增删改查（修改后返回统计/日历刷新即可联动）
7. 目标设置页调整任务 `daily_target_count`，影响“每日目标达成 streak”计算

## 4. 页面清单（当前实现）
- `/`：营销/入口页（登录/注册）
- `/auth/login`：登录（中文失败提示）
- `/auth/register`：注册（中文提示；如启用邮箱验证则提示去邮箱验证）
- `/app/dashboard`：受保护主页（入口导航 + 目标设置入口）
- `/app/checkin/today`：今日打卡（习惯/任务切换 + 打卡/撤销 + 备注/次数编辑 + 添加习惯/任务）
- `/app/checkin/calendar`：打卡日历（按月、选择习惯/任务、任务口径单项/每日目标可切换、点击日期查看详情 + 最近14天小图表）
- `/app/stats`：连续天数与统计图表（口径可切换、当月完成率、最近14天柱状图）
- `/app/history`：打卡流水历史 CRUD（筛选日期范围 + 选择习惯/任务 + 分页 + 增删改）
- `/app/settings/targets`：任务目标设置（维护 `daily_target_count`）

## 5. 数据模型（Supabase Postgres）

### 5.1 表结构
见 `supabase/migrations/001_init.sql`，核心表：
- `profiles`：用户资料（时区偏好等）
- `habits`：习惯定义
- `tasks`：任务定义
- `habit_checkins`：习惯打卡流水（唯一：`(user_id, habit_id, date)`）
- `task_checkins`：任务打卡流水（唯一：`(user_id, task_id, date)`，包含 `done_count`）
- `task_daily_targets`：任务每日目标（唯一：`(user_id, task_id)`，包含 `daily_target_count`）

### 5.2 RLS（Row Level Security）
所有数据表均开启 RLS，并通过 policies 严格限制：
- 只能读取/写入 `auth.uid()` 对应用户的数据
- checkins 写入时校验关联 item（habit/task）属于当前用户，防止篡改他人记录

## 6. 统计计算实现要点
- 使用统一日期归一化（应用时区 `Asia/Shanghai`，以 `YYYY-MM-DD` 作为 dateKey）
- streak 计算：从今日向过去回溯，逐日判断“是否达成”直到不满足停止
- 当月完成率：当月天数中达成天数 / 总天数
- 最近天数图表：最近 14 天按口径映射为柱状值（习惯 0/1；任务可显示达标 0/1 或完成次数）

## 7. 异常与中文提示策略
- 前端使用统一的错误映射函数 `src/lib/errors.ts`：
  - Supabase 常见认证错误与密码规则错误 -> 中文提示
  - HTTP 状态码（401/403/429/5xx） -> 中文提示
  - 未识别错误 -> “操作失败/未知错误稍后重试”
- 所有关键交互页在失败时会展示错误横幅（而不是静默失败）

## 8. 打卡流水 CRUD 规则
- `新增/更新`：按“选择日期 + 选择 item”进行覆盖（存在则更新，不存在则插入）
- `撤销/删除`：
  - 习惯：删除对应 `habit_checkins` 记录
  - 任务：删除对应 `task_checkins` 记录（当 `done_count <= 0` 时等价撤销）
- `编辑`：编辑备注/完成次数并保存，保存后统计口径通过刷新重新计算实现联动

## 9. 部署与上线
- 应用当前为 Next.js + Supabase（RLS）架构
- 数据库结构通过 `supabase/migrations/001_init.sql` 初始化
- 部署目标：Vercel（并输出可访问链接）
- Supabase 与 Vercel 的环境变量：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 其余服务端写入需求如后续扩展再补充

