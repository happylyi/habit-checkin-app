type AnyError = unknown;

function getErrorMessage(err: AnyError) {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const maybe = err as { message?: unknown };
    if (typeof maybe.message === "string") return maybe.message;
  }
  return "";
}

function getHttpStatus(err: AnyError) {
  if (!err || typeof err !== "object") return null;
  const maybe = err as { status?: unknown };
  if (typeof maybe.status === "number") return maybe.status;
  return null;
}

/**
 * 将 Supabase / fetch / 运行时异常统一映射为中文提示。
 * 由于 Supabase 的 message 在不同场景可能是英文，这里做“尽量友好”的降级策略。
 */
export function getZhErrorMessage(err: AnyError) {
  const msg = getErrorMessage(err);
  const status = getHttpStatus(err);

  if (status === 401) return "未授权或会话已过期，请重新登录。";
  if (status === 403) return "无权限执行该操作，请检查后重试。";
  if (status === 429) return "请求过于频繁，请稍后再试。";
  if (status && status >= 500) return "服务器异常，请稍后重试。";

  if (msg.includes("Invalid login credentials") || msg.includes("Invalid email")) return "账号或密码不正确，请检查后重试。";
  if (msg.includes("Password should be at least") || msg.toLowerCase().includes("password")) return "密码格式不符合要求，请使用更强的密码。";
  if (msg.toLowerCase().includes("user already registered")) return "该邮箱已注册，请直接登录。";
  if (!msg) return "发生未知错误，请稍后重试。";
  // message 可能是英文，保底拼接成可读提示
  return `操作失败：${msg}`;
}

