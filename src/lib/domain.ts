import type { QuizDraft } from "./types";
export const REVEAL_AT = "2026-10-26T20:00:00-07:00";
export const TIMEZONE = "America/Los_Angeles";
export const isRevealed = (revealAt: string, serverNow: number) =>
  serverNow >= Date.parse(revealAt);
export function countdown(revealAt: string, serverNow: number) {
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(revealAt) - serverNow) / 1000),
  );
  return [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ];
}
export function validateQuiz(draft: QuizDraft): string | null {
  if (!draft.title.trim() || draft.title.length > 120)
    return "请填写 120 字以内的问答标题。";
  if (draft.questions.length < 1 || draft.questions.length > 12)
    return "问答需要 1–12 道题。";
  if (new Set(draft.questions.map((q) => q.id)).size !== draft.questions.length)
    return "题目编号重复，请重新添加题目。";
  for (const [i, q] of draft.questions.entries()) {
    if (!q.prompt.trim() || q.prompt.length > 500)
      return `请填写第 ${i + 1} 题的题目（最多 500 字）。`;
    if (
      q.options.length < 2 ||
      q.options.length > 6 ||
      q.options.some((o) => !o.trim() || o.length > 200)
    )
      return `请完善第 ${i + 1} 题的选项。`;
    if (
      q.answer === null ||
      !Number.isInteger(q.answer) ||
      q.answer < 0 ||
      q.answer >= q.options.length
    )
      return `请为第 ${i + 1} 题选择正确答案。`;
  }
  return null;
}
export function validImage(file: Pick<File, "type" | "size">) {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size > 0 &&
    file.size <= 5 * 1024 * 1024
  );
}
export function errorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  const known: Record<string, string> = {
    family_only: "请使用受邀家庭账号登录。",
    sonya_only: "这个页面仅向 Sonya 开放。",
    not_found: "这个链接不存在、已关闭或已被更换。",
    not_owner: "你只能编辑自己的作品。",
    quiz_full: "本次问答已达到参与上限，请联系 Sonya。",
    invalid_answers: "请完成所有题目后再提交。",
    not_ready: "请先保存内容，并完善标题、题目和正确答案。",
    "Invalid login credentials": "昵称或密码不正确，请重试。",
    "Failed to fetch": "暂时无法连接，请检查网络后重试。",
  };
  return known[message] || message || "操作未完成，请稍后重试。";
}
