"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getZhErrorMessage } from "@/lib/errors";

export default function LoginPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorText(getZhErrorMessage(error));
      setLoading(false);
      return;
    }

    router.push("/app/dashboard");
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-50">
      <div className="mx-auto max-w-md p-4">
        <h1 className="py-10 text-center text-2xl font-semibold">登录</h1>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600">邮箱</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-300"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-600">密码</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-300"
            />
          </label>

          {errorText ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorText}</div> : null}

          <button
            disabled={loading}
            className="mt-2 h-11 rounded-xl bg-zinc-900 text-white disabled:opacity-60"
          >
            {loading ? "登录中..." : "登录"}
          </button>

          <div className="py-2 text-center text-sm text-zinc-600">
            还没有账号？{" "}
            <a className="font-medium text-zinc-900" href="/auth/register">
              去注册
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}

