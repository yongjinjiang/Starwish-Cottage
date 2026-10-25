export function resolveProjectUrl(env) {
  const raw = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  if (!raw || raw.includes("YOUR_PROJECT")) {
    throw new Error("请先在 .env.local 中设置星愿小屋的 VITE_SUPABASE_URL。");
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Supabase 项目地址格式不正确，请检查 .env.local。");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["", "/"].includes(url.pathname)
  ) {
    throw new Error(
      "Supabase 项目地址必须是项目的 HTTPS 根地址，请勿填写控制台链接或 API 路径。",
    );
  }
  if (env.SUPABASE_URL && env.VITE_SUPABASE_URL) {
    let frontend;
    try {
      frontend = new URL(env.VITE_SUPABASE_URL);
    } catch {
      throw new Error("VITE_SUPABASE_URL 格式不正确。");
    }
    if (frontend.origin !== url.origin)
      throw new Error(
        "SUPABASE_URL 与网站使用的 VITE_SUPABASE_URL 不属于同一个项目，请先核对 .env.local。",
      );
  }
  return url.origin;
}

export function normalizeServerKey(input) {
  let value = String(input ?? "").trim();
  if (
    value.length >= 2 &&
    ['"', "'", "`"].includes(value[0]) &&
    value.at(-1) === value[0]
  )
    value = value.slice(1, -1).trim();
  return value;
}

export function validateServerKey(input, projectUrl) {
  const key = normalizeServerKey(input);
  if (!key || key === "YOUR_SERVER_SECRET_KEY")
    throw new Error(
      "没有读到服务器密钥。请复制完整密钥，粘贴后按回车；输入时不会显示字符。",
    );
  if (key.startsWith("sb_publishable_"))
    throw new Error(
      "你输入的是 Publishable key。初始化账号需要同一项目的 Secret key（以 sb_secret_ 开头）。",
    );
  if (key.startsWith("sbp_"))
    throw new Error(
      "你输入的是个人访问令牌。请改用星愿小屋项目的 Secret key（以 sb_secret_ 开头）。",
    );
  if (/[\s\u200B-\u200D\uFEFF]/u.test(key) || /\.{2}|…|[*•●]/u.test(key))
    throw new Error(
      "密钥包含空格、不可见字符或掩码。请点击 Secret key 旁的复制按钮，复制完整密钥本身。",
    );
  if (/^sb_secret_[A-Za-z0-9_-]{16,}$/.test(key)) return key;
  if (key.startsWith("eyJ")) {
    try {
      const parts = key.split(".");
      if (parts.length !== 3) throw new Error("invalid token");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      );
      if (payload.role !== "service_role")
        throw new Error("legacy public token");
      const ref = new URL(projectUrl).hostname.split(".")[0];
      if (payload.ref && payload.ref !== ref)
        throw new Error("legacy project mismatch");
      return key;
    } catch (error) {
      if (error.message === "legacy project mismatch")
        throw new Error(
          "这把旧版 service_role 密钥属于其他项目，请使用当前星愿小屋项目的密钥。",
        );
      throw new Error(
        "这不是有效的旧版 service_role 密钥。请使用当前项目的 Secret key（以 sb_secret_ 开头）。",
      );
    }
  }
  throw new Error(
    "未识别为完整的服务器密钥。请复制当前项目 Secret keys 下的 sb_secret_ 密钥；不要输入账号密码、数据库密码或密钥名称。",
  );
}

export function setupErrorMessage(error, projectUrl, secret = "") {
  let detail = error?.message
    ? String(error.message)
    : "操作未完成，请稍后重试。";
  if (secret) detail = detail.replaceAll(secret, "[密钥已隐藏]");
  if (
    /invalid api key|invalid.*jwt|invalid token|not a valid JWT|expired.*jwt/i.test(
      detail,
    )
  ) {
    return `Supabase 没有接受这把密钥（Invalid API key）。\n目标项目：${projectUrl}\n请从这个项目的 Settings → API Keys → Secret keys 重新复制完整密钥。\n可能是其他项目的密钥、已失效的密钥，或复制了掩码/不完整文本。\n请勿把密钥发到聊天里。`;
  }
  if (/fetch failed|failed to fetch|ECONN|ENOTFOUND|ETIMEDOUT/i.test(detail))
    return `无法连接 ${projectUrl}。请检查网络后重试；如上方已显示账号密码，请先私下保存。重试不会重置已有密码。`;
  return detail;
}

export async function preflightAdmin(db) {
  // Read-only authentication check. Never create or reset users before it succeeds.
  const { error } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw error;
  const { data, error: membershipError } = await db
    .from("family_members")
    .select("handle");
  if (membershipError)
    throw new Error(
      `服务器密钥已通过身份验证，但家庭成员表无法读取：${membershipError.message}`,
    );
  return data;
}
