"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  async function onSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white"
    >
      退出登录
    </button>
  );
}

