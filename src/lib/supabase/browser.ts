"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/**
 * 浏览器端 Supabase 客户端（用于登录/注册等交互式页面）。
 * 注意：依赖 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。
 */
export function getSupabaseBrowserClient() {
  if (cached) return cached;

  // 注意：为了让 `next build` 在尚未注入环境变量时也能通过，
  // 这里不直接 throw；等运行时真正发请求再由错误提示暴露。
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key";

  cached = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return cached;
}

