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
    <main className="min-h-[100dvh] bg-zinc-50" data-oid="k4in8-4">
      <div className="mx-auto max-w-md p-4" data-oid="fnxz11c">
        <h1
          className="py-10 text-center text-2xl font-semibold"
          data-oid="v1q80yg"
        >
          登录
        </h1>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
          data-oid="1vs9p6j"
        >
          <label className="flex flex-col gap-1" data-oid="yfyonmi">
            <span className="text-sm text-zinc-600" data-oid="o2vn5e5">
              邮箱
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-300"
              data-oid="tnhugr4"
            />
          </label>

          <label className="flex flex-col gap-1" data-oid="0m6jtcf">
            <span className="text-sm text-zinc-600" data-oid="6ogu25a">
              密码
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-300"
              data-oid="j667t3b"
            />
          </label>

          {errorText ? (
            <div
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              data-oid="6n8sjmz"
            >
              {errorText}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="mt-2 h-11 rounded-xl bg-zinc-900 text-white disabled:opacity-60"
            data-oid="n_6l8h5"
          >
            {loading ? "登录中..." : "登录"}
          </button>

          <div
            className="py-2 text-center text-sm text-zinc-600"
            data-oid="izgmbo1"
          >
            还没有账号？{" "}
            <a
              className="font-medium text-zinc-900"
              href="/auth/register"
              data-oid="_ocf.11"
            >
              去注册
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
