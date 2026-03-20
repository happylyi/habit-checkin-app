# 部署指南：Supabase + Vercel（手动）

说明：你当前未提供 Supabase keys / Vercel token，因此我只能提供“可直接照做”的部署步骤。你完成部署后，把 Vercel 的访问链接发我，我可以继续帮你做全链路检查与修复。

---

## 1. 创建 Supabase 项目并初始化数据库
1. 打开 Supabase 控制台，创建新项目。
2. 在 `SQL Editor` 中执行文件：`supabase/migrations/001_init.sql`  
   - 同时阅读 `supabase/README.md` 中的执行/回滚说明。
3. 确认 Auth 已开启“邮箱/密码”（email/password）。
4. 获取并记录以下环境变量值：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> 可选：如果你的 Supabase 设置了“邮箱验证”，注册后首次登录需要先到邮箱完成验证。

---

## 2. 准备代码仓库（GitHub）
1. 在 GitHub 上创建仓库（例如 `yourname/habit-checkin-app`）。
2. 把当前项目代码推送到该仓库（确保已包含 `.next/` 不会被推送，通常由 `.gitignore` 控制）。

---

## 3. 在 Vercel 上连接仓库并部署
1. 登录 Vercel，选择 “Add New… → Project”
2. 选择 GitHub 仓库并导入。
3. Vercel 环境变量设置（Project Settings → Environment Variables）添加：
   - `NEXT_PUBLIC_SUPABASE_URL`（刚才从 Supabase 获取）
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`（刚才从 Supabase 获取）
4. 构建设置保持默认（Next.js 自动识别）。
5. 点击 Deploy。

---

## 4. 全链路验证清单
部署完成后打开页面，依次检查：
1. `注册 / 登录` 是否正常（出现中文错误提示）
2. 进入 `/app/dashboard` 是否能正确受保护
3. `/app/checkin/today`
   - 添加习惯/任务
   - 打卡/撤销
   - 保存备注/完成次数
4. `/app/checkin/calendar`
   - 切换习惯/任务
   - 切换任务达成口径（单项/每日目标）
5. `/app/stats`
   - 连续天数计算随口径切换
   - 最近14天柱状图渲染正常
6. `/app/history`
   - 新增/更新/删除流水
   - 回到统计页后是否能反映变化
7. `/app/settings/targets`
   - 更新 `daily_target_count` 后，统计页的“每日目标达成 streak”是否变化

---

## 5. 国内可访问性（注意）
Vercel 默认 CDN 可能在国内访问速度不稳定。若你遇到“打不开/慢”，可以：
1. 使用自定义域名 + DNS/代理（例如 Cloudflare）
2. 或在国内增加反向代理（公司/服务器侧）

你把最终链接发我后，我也可以按实际效果给你建议最优方案。

