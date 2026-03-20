import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "每日打卡",
  description: "习惯/任务每日打卡与连续天数统计",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased" data-oid="jz0f4zq">
      <body
        className="min-h-full flex flex-col bg-zinc-50 text-zinc-950"
        data-oid="do.9mk1"
      >
        {children}
      </body>
    </html>
  );
}
