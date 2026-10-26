import { describe, it, expect } from "vitest";
import { accountLocale, browserLocale, translate } from "../src/lib/locale";
import { newQuizTemplate } from "../src/data/template";
import { validateQuiz } from "../src/lib/domain";

describe("language choices", () => {
  it("follows the first supported browser language and falls back to English", () => {
    expect(browserLocale(["zh-TW", "en-US"])).toBe("zh-CN");
    expect(browserLocale(["en-GB", "zh-CN"])).toBe("en");
    expect(browserLocale(["fr-FR", "zh-HK"])).toBe("zh-CN");
    expect(browserLocale(["fr-FR"])).toBe("en");
  });
  it("uses family defaults while respecting each saved preference", () => {
    expect(accountLocale({ role: "celebrant" })).toBe("en");
    expect(accountLocale({ role: "contributor", locale: null })).toBe("en");
    expect(accountLocale({ role: "parent" })).toBe("zh-CN");
    expect(accountLocale({ role: "parent", locale: "en" })).toBe("en");
    expect(accountLocale({ role: "celebrant", locale: "zh-CN" })).toBe("zh-CN");
  });
  it("renders variable labels and existing validation errors in the selected language", () => {
    expect(
      translate("en", "第 {{n}} 题选项 {{letter}}", { n: 2, letter: "A" }),
    ).toBe("Question 2 option A");
    const reason = validateQuiz(newQuizTemplate("en"))!;
    expect(translate("en", reason)).toBe(
      "Choose the correct answer for question 1.",
    );
    expect(translate("zh-CN", reason)).toBe(reason);
    expect(translate("en", "请填写第 2 题的题目（最多 500 字）。")).toBe(
      "Enter the prompt for question 2 (up to 500 characters).",
    );
  });
  it("creates readable templates in both languages with the same question identities", () => {
    const en = newQuizTemplate("en"),
      zh = newQuizTemplate("zh-CN");
    expect(JSON.stringify(en)).not.toMatch(/[\u3400-\u9fff]/);
    expect(zh.questions[0].prompt).toBe("Sonya 最喜欢的书是哪一本？");
    expect(en.questions.map((q) => q.id)).toEqual(
      zh.questions.map((q) => q.id),
    );
    expect(en.questions.every((q) => q.answer === null)).toBe(true);
  });
});
