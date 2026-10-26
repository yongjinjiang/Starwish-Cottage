// Development-only design sandbox. main.tsx never imports this module in production.
import { newQuizTemplate } from "../data/template";
import { REVEAL_AT, TIMEZONE, validateQuiz } from "./domain";
import type {
  CottageApi,
  Gift,
  Handle,
  Member,
  Publication,
  QuizDraft,
  Submission,
} from "./types";
const family: Member[] = [
  {
    user_id: "sonya",
    handle: "sonya12",
    display_name: "Sonya",
    role: "celebrant",
  },
  { user_id: "mia", handle: "Mia14", display_name: "Mia", role: "contributor" },
  {
    user_id: "aletheia",
    handle: "Aletheia10",
    display_name: "Aletheia",
    role: "contributor",
  },
  { user_id: "mom", handle: "mom45", display_name: "妈妈", role: "parent" },
  { user_id: "dad", handle: "dad51", display_name: "爸爸", role: "parent" },
];
let current: Member | null = null;
let revealed = false;
let draft: QuizDraft | null = null;
let publication: Publication | null = null;
let publishedBank: QuizDraft | null = null;
const gifts = new Map<string, Gift>();
const published = new Map<string, Gift>();
const submissions = new Map<string, Submission>();
const clone = <T>(value: T): T => structuredClone(value);
function requireMember() {
  if (!current) throw new Error("family_only");
  return current;
}
function sonya() {
  if (requireMember().role !== "celebrant") throw new Error("sonya_only");
}
function own(id: string) {
  const gift = gifts.get(id);
  if (!gift || gift.author_id !== requireMember().user_id)
    throw new Error("not_owner");
  return gift;
}
export const previewControls = {
  setIdentity(handle: string) {
    current = family.find((m) => m.handle === handle) ?? null;
  },
  setRevealed(value: boolean) {
    revealed = value;
  },
};
export const previewApi: CottageApi = {
  async getInfo() {
    return {
      title: "Sonya 的十二岁生日",
      reveal_at: REVEAL_AT,
      timezone: TIMEZONE,
      server_now: revealed
        ? new Date(Date.parse(REVEAL_AT) + 1000).toISOString()
        : "2026-10-25T00:00:00Z",
    };
  },
  async setLocale(userId, locale) {
    if (requireMember().user_id !== userId) throw new Error("family_only");
    current!.locale = locale;
  },
  async getMember() {
    return clone(current);
  },
  async signIn(handle) {
    current =
      family.find((m) => m.handle.toLowerCase() === handle.toLowerCase()) ??
      null;
    if (!current) throw new Error("family_only");
  },
  async signOut() {
    current = null;
  },
  async listDrafts() {
    const id = requireMember().user_id;
    return clone(
      [...gifts.values()]
        .filter((g) => g.author_id === id)
        .map((g) => ({
          ...g,
          published_at: published.get(g.id)?.published_at,
        })),
    );
  },
  async saveGift(gift) {
    const m = requireMember();
    if (m.role === "celebrant") throw new Error("family_only");
    gifts.set(gift.id, clone({ ...gift, author_id: m.user_id }));
  },
  async publishGift(id) {
    const gift = own(id);
    if (!gift.title.trim() || (!gift.body.trim() && !gift.image_paths.length))
      throw new Error("not_ready");
    published.set(
      id,
      clone({
        ...gift,
        published_at: new Date().toISOString(),
        author_name: current!.display_name,
      }),
    );
  },
  async withdrawGift(id) {
    own(id);
    published.delete(id);
  },
  async gallery() {
    requireMember();
    return revealed ? clone([...published.values()]) : [];
  },
  async uploadImage(file) {
    requireMember();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  async imageUrl(objectPath) {
    requireMember();
    return objectPath;
  },
  async getQuizDraft() {
    sonya();
    return clone(draft);
  },
  async saveQuizDraft(value) {
    sonya();
    draft = clone(value);
  },
  async publishQuiz() {
    sonya();
    if (!draft || validateQuiz(draft)) throw new Error("not_ready");
    publishedBank = clone(draft);
    publication = {
      id: crypto.randomUUID(),
      share_token:
        crypto.randomUUID().replaceAll("-", "") +
        crypto.randomUUID().replaceAll("-", ""),
      title: draft.title,
      active: true,
    };
    return clone(publication);
  },
  async getPublication() {
    sonya();
    return clone(publication?.active ? publication : null);
  },
  async closeQuiz() {
    sonya();
    if (publication) publication.active = false;
  },
  async publicQuiz(token) {
    if (
      !publication?.active ||
      publication.share_token !== token ||
      !publishedBank
    )
      throw new Error("not_found");
    return {
      id: publication.id,
      title: publication.title,
      questions: publishedBank.questions.map(({ answer: _answer, ...q }) =>
        clone(q),
      ),
    };
  },
  async submitQuiz(token, nickname, answers, requestId) {
    const paper = await this.publicQuiz(token);
    const old = submissions.get(requestId);
    if (old) return clone(old);
    if (paper.questions.some((q) => answers[q.id] === undefined))
      throw new Error("invalid_answers");
    const result: Submission = {
      id: crypto.randomUUID(),
      score: publishedBank!.questions.filter((q) => answers[q.id] === q.answer)
        .length,
      total: paper.questions.length,
      nickname,
      answers: clone(answers),
      submitted_at: new Date().toISOString(),
      reward_status: "pending",
      quiz_title: paper.title,
      questions: clone(publishedBank!.questions),
    };
    submissions.set(requestId, result);
    return clone(result);
  },
  async results() {
    sonya();
    return clone([...submissions.values()]);
  },
  async reward(id, status) {
    sonya();
    for (const s of submissions.values())
      if (s.id === id) s.reward_status = status;
  },
};
// No example answers or family greetings are created on the real backend.
export function previewTemplate() {
  const value = newQuizTemplate();
  value.questions = value.questions.slice(0, 2).map((q) => ({
    ...q,
    options: ["一本书", "另一本书", "一本漫画", "一本诗集"],
    answer: 0,
  }));
  return value;
}
export type PreviewControls = typeof previewControls;
export type PreviewHandle = Handle;
