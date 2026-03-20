"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getZhErrorMessage } from "@/lib/errors";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);
    setSuccessText(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorText(getZhErrorMessage(error));
      setLoading(false);
      return;
    }

    // 若开启邮箱验证，signUp 可能返回 user=null。
    const emailConfirmationSent =
      typeof data === "object" &&
      data !== null &&
      "user" in data &&
      (data as { user?: unknown }).user === null;
    if (emailConfirmationSent) {
      setSuccessText("注册成功！请到邮箱完成验证后再登录。");
      setLoading(false);
      return;
    }

    setSuccessText("注册成功，正在跳转到登录页...");
    setLoading(false);
    router.push("/auth/login");
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-50" data-oid="fm.itok">
      <div className="mx-auto max-w-md p-4" data-oid="34dyuue">
        <h1
          className="py-10 text-center text-2xl font-semibold"
          data-oid="d6ygb9q"
        >
          注册
        </h1>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
          data-oid="xz_s_r7"
        >
          <label className="flex flex-col gap-1" data-oid="uv0ygb4">
            <span className="text-sm text-zinc-600" data-oid="nifxqp0">
              邮箱
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-300"
              data-oid=".p-_alq"
            />
          </label>

          <label className="flex flex-col gap-1" data-oid="ib0c97v">
            <span className="text-sm text-zinc-600" data-oid="9_wv1ec">
              密码
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-300"
              data-oid=".tbnkxf"
            />
          </label>

          {errorText ? (
            <div
              className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
              data-oid="hwl_pt4"
            >
              {errorText}
            </div>
          ) : null}
          {successText ? (
            <div
              className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
              data-oid="xaxt..q"
            >
              {successText}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="mt-2 h-11 rounded-xl bg-zinc-900 text-white disabled:opacity-60"
            data-oid="1d-:zzt"
          >
            {loading ? "提交中..." : "注册"}
          </button>

          <div
            className="py-2 text-center text-sm text-zinc-600"
            data-oid="ijey93y"
          >
            已有账号？{" "}
            <a
              className="font-medium text-zinc-900"
              href="/auth/login"
              data-oid="e1jmxkt"
            >
              去登录
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
