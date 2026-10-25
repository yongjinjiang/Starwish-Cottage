import type { QuizDraft } from '../lib/types';
export const newQuizTemplate = (): QuizDraft => ({
  title: '你有多了解 Sonya？',
  questions: ['Sonya 最喜欢的书是哪一本？', 'Sonya 最喜欢的食物是什么？', 'Sonya 最喜欢的休闲活动是什么？', 'Sonya 理想中的生日是什么样的？'].map((prompt, i) => ({
    id: `sonya-${i + 1}`, prompt, options: ['选项 A（请修改）', '选项 B（请修改）', '选项 C（请修改）', '选项 D（请修改）'], answer: null,
  })),
});
