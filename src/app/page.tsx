export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-zinc-50">
      <div className="mx-auto flex max-w-md flex-col gap-6 p-4">
        <header className="pt-12">
          <h1 className="text-center text-3xl font-semibold tracking-tight">每日打卡</h1>
          <p className="mt-3 text-center text-zinc-600">习惯/任务两种模式，跨设备同步，统计清晰可见。</p>
        </header>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <a href="/auth/login" className="flex h-11 items-center justify-center rounded-xl bg-zinc-900 text-white">
              登录
            </a>
            <a
              href="/auth/register"
              className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900"
            >
              注册
            </a>
          </div>
        </section>

        <footer className="pb-10 text-center text-xs text-zinc-500">
          说明：需要接入 Supabase 配置后才能使用全部功能。
        </footer>
      </div>
    </main>
  );
}
