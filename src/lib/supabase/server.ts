import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 服务端 Supabase 客户端（用于 Server Components / Route Handlers）。
 * 说明：cookie 的 setAll 在 Server Components 中受 Next 限制，刷新令牌时通常依赖 middleware。
 */
export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 注意：为了让 `next build` 在尚未注入环境变量时也能通过，
  // 这里不直接 throw；等运行时真正发请求再由错误提示暴露。
  const url = supabaseUrl ?? "http://localhost:54321";
  const anonKey = supabaseAnonKey ?? "missing-anon-key";

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () =>
        cookieStore.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      // setAll 在部分场景可能无法写入响应 cookie；我们优先依赖 middleware 完成会话同步。
    },
  });
}

export async function getSupabaseUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

