import { english, chinese } from "../data/messages";
export type Locale = "en" | "zh-CN";
export const GUEST_LOCALE_KEY = "starwish.locale.guest.v1";
export const isLocale = (value: unknown): value is Locale =>
  value === "en" || value === "zh-CN";
export function browserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (/^zh(?:-|$)/i.test(language)) return "zh-CN";
    if (/^en(?:-|$)/i.test(language)) return "en";
  }
  return "en";
}
export const accountLocale = (member: {
  role: string;
  locale?: Locale | null;
}): Locale =>
  isLocale(member.locale)
    ? member.locale
    : member.role === "parent"
      ? "zh-CN"
      : "en";
export function translate(
  locale: Locale,
  key: string,
  values: Record<string, string | number> = {},
): string {
  let message = (locale === "en" ? english[key] : chinese[key]) ?? key;
  // Existing domain validation messages carry a question number. Keep them as
  // data until rendering, so a visible error follows a language switch too.
  if (locale === "en" && message === key) {
    const patterns: [RegExp, (number: string) => string][] = [
      [
        /^请填写第 (\d+) 题的题目（最多 500 字）。$/,
        (n) => `Enter the prompt for question ${n} (up to 500 characters).`,
      ],
      [
        /^请完善第 (\d+) 题的选项。$/,
        (n) => `Complete the options for question ${n}.`,
      ],
      [
        /^请为第 (\d+) 题选择正确答案。$/,
        (n) => `Choose the correct answer for question ${n}.`,
      ],
    ];
    for (const [pattern, format] of patterns) {
      const match = key.match(pattern);
      if (match) {
        message = format(match[1]);
        break;
      }
    }
  }
  return message.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) =>
    String(values[name] ?? placeholder),
  );
}
