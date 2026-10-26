import { describe, it, expect } from "vitest";
import {
  countdown,
  isRevealed,
  REVEAL_AT,
  validateQuiz,
  validImage,
} from "../src/lib/domain";
import { newQuizTemplate } from "../src/data/template";
describe("birthday boundary", () => {
  it("reveals at 8pm California, never one millisecond before", () => {
    const time = Date.parse("2026-10-27T03:00:00Z");
    expect(Date.parse(REVEAL_AT)).toBe(time);
    expect(isRevealed(REVEAL_AT, time - 1)).toBe(false);
    expect(isRevealed(REVEAL_AT, time)).toBe(true);
    expect(countdown(REVEAL_AT, time - 1000)).toEqual([0, 0, 0, 1]);
    expect(countdown(REVEAL_AT, time + 1000)).toEqual([0, 0, 0, 0]);
  });
  it("requires Sonya to choose template answers explicitly", () => {
    const paper = newQuizTemplate();
    expect(validateQuiz(paper)).toContain("正确答案");
    paper.questions.forEach((q) => (q.answer = 0));
    expect(validateQuiz(paper)).toBeNull();
    paper.questions[0].answer = 8;
    expect(validateQuiz(paper)).toContain("正确答案");
  });
  it("accepts only bounded raster uploads", () => {
    expect(validImage({ type: "image/png", size: 500 })).toBe(true);
    expect(validImage({ type: "image/svg+xml", size: 500 })).toBe(false);
    expect(validImage({ type: "image/png", size: 6 * 1024 * 1024 })).toBe(
      false,
    );
  });
});
