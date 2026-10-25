// Run locally. The server secret is read without echo and never saved or sent to the frontend.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { Writable } from "node:stream";
import readline from "node:readline";
import {
  normalizeServerKey,
  preflightAdmin,
  resolveProjectUrl,
  setupErrorMessage,
  validateServerKey,
} from "./lib/family-setup.mjs";
let projectUrl = "";
let secret = "";
async function readSecret() {
  const configured = normalizeServerKey(process.env.SUPABASE_SECRET_KEY);
  if (configured && configured !== "YOUR_SERVER_SECRET_KEY") {
    console.log("密钥来源：SUPABASE_SECRET_KEY 环境变量（值不显示）。");
    return configured;
  }
  if (!process.stdin.isTTY)
    throw new Error(
      "请在你自己的交互式终端运行此命令，并按提示输入服务器密钥。",
    );
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, done) {
      if (!muted) process.stdout.write(chunk);
      done();
    },
  });
  const input = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  return new Promise((resolve, reject) => {
    let answered = false;
    input.on("SIGINT", () => {
      input.close();
    });
    input.on("close", () => {
      if (!answered) {
        process.stdout.write("\n");
        reject(new Error("初始化已取消。"));
      }
    });
    input.question(
      "粘贴本项目的 Secret key（sb_secret_，输入隐藏）: ",
      (answer) => {
        answered = true;
        input.close();
        process.stdout.write("\n");
        resolve(answer);
      },
    );
    muted = true;
  });
}
async function main() {
  const flags = new Set(process.argv.slice(2));
  if (flags.has("--check") && flags.has("--reset-passwords"))
    throw new Error("--check 是只读验证，不能与 --reset-passwords 一起使用。");
  if (
    [...flags].some((flag) => !["--check", "--reset-passwords"].includes(flag))
  )
    throw new Error(
      "支持的选项：--check（只读验证）、--reset-passwords（重置五个账号密码）。",
    );
  projectUrl = resolveProjectUrl(process.env);
  console.log(`目标 Supabase 项目：${projectUrl}`);
  console.log(
    `密钥页面：https://supabase.com/dashboard/project/${new URL(projectUrl).hostname.split(".")[0]}/settings/api-keys`,
  );
  secret = normalizeServerKey(await readSecret());
  secret = validateServerKey(secret, projectUrl);
  const db = createClient(projectUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const existingMembers = await preflightAdmin(db);
  console.log(
    `服务器密钥与项目连接验证成功，已登记 ${existingMembers.length} 个家庭账号。`,
  );
  if (flags.has("--check")) {
    console.log(
      "只读检查通过，没有创建账号或更改密码。现在可运行 npm run provision:family 完成初始化。",
    );
    return;
  }
  const accounts = [
    ["sonya12", "Sonya", "celebrant"],
    ["Mia14", "Mia", "contributor"],
    ["Aletheia10", "Aletheia", "contributor"],
    ["mom45", "妈妈", "parent"],
    ["dad51", "爸爸", "parent"],
  ];
  const reset = flags.has("--reset-passwords");
  for (const [handle, display_name, role] of accounts) {
    const email = `${handle.toLowerCase()}@family.starwish.example`;
    const { data: existing, error: lookupError } = await db
      .from("family_members")
      .select("user_id")
      .eq("handle", handle)
      .maybeSingle();
    if (lookupError)
      throw new Error(`家庭成员读取失败：${lookupError.message}`);
    let userId = existing?.user_id;
    let password;
    if (!userId) {
      const { data: list, error: listError } = await db.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) throw listError;
      userId = list.users.find((user) => user.email === email)?.id;
    }
    if (!userId) {
      password = `Sw!${randomBytes(12).toString("base64url")}`;
      const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw new Error(`创建 ${handle} 失败：${error.message}`);
      userId = data.user.id;
      console.log(`${handle}: ${password}`);
    } else if (reset) {
      password = `Sw!${randomBytes(12).toString("base64url")}`;
      const { error } = await db.auth.admin.updateUserById(userId, {
        password,
      });
      if (error) throw error;
      console.log(`${handle}: ${password}`);
    }
    const { error } = await db
      .from("family_members")
      .upsert(
        { user_id: userId, handle, display_name, role },
        { onConflict: "user_id" },
      );
    if (error)
      throw new Error(
        `登记 ${handle} 权限失败：${error.message}。已创建账号的密码仍有效，请保存上方输出后重新运行此脚本。`,
      );
    if (!password) console.log(`${handle}: 已登记（密码保持不变）。`);
  }
  console.log(
    "五个家庭账号已初始化。请把密码私下保存到密码管理器；脚本不会保存密码或发送邮件。",
  );
}
main().catch((error) => {
  console.error(`\n${setupErrorMessage(error, projectUrl, secret)}`);
  process.exitCode = 1;
});
