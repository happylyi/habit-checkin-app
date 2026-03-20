import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 全局会话守卫：
 * - 未登录访问 `/app/*`：跳转到 `/auth/login`
 * - 已登录访问 `/auth/*`：跳转到 `/app/dashboard`
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 本地开发未配置时，直接放行（后续页面会给出更明确提示）
  if (!supabaseUrl || !supabaseAnonKey) return res;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () =>
        req.cookies.getAll().map((c) => ({
          name: c.name,
          value: c.value,
        })),
      setAll: (cookiesToSet) => {
        for (const c of cookiesToSet) {
          res.cookies.set(c.name, c.value, c.options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;
  const isAppRoute = pathname.startsWith("/app/");
  const isAuthRoute = pathname.startsWith("/auth/");

  if (isAppRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/app/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/auth/:path*", "/app/:path*"],
};

