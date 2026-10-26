import type { QuizDraft } from "../lib/types";
import { translate, type Locale } from "../lib/locale";
export const newQuizTemplate = (locale: Locale = "en"): QuizDraft => ({
  title: translate(locale, "你有多了解 Sonya？"),
  questions: [
    "Sonya 最喜欢的书是哪一本？",
    "Sonya 最喜欢的食物是什么？",
    "Sonya 最喜欢的休闲活动是什么？",
    "Sonya 理想中的生日是什么样的？",
  ].map((prompt, i) => ({
    id: `sonya-${i + 1}`,
    prompt: translate(locale, prompt),
    options: [
      ...["A", "B", "C", "D"].map((letter) =>
        translate(locale, "选项 {{letter}}（请修改）", { letter }),
      ),
    ],
    answer: null,
  })),
});
