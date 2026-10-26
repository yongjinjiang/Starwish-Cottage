import type { Locale } from "./locale";
export const HANDLES = [
  "sonya12",
  "Mia14",
  "Aletheia10",
  "mom45",
  "dad51",
] as const;
export type Handle = (typeof HANDLES)[number];
export type Theme = "starlight" | "garden" | "moon";
export interface Member {
  user_id: string;
  handle: Handle;
  display_name: string;
  role: "celebrant" | "contributor" | "parent";
  locale?: Locale | null;
}
export interface EventInfo {
  title: string;
  reveal_at: string;
  timezone: string;
  server_now: string;
}
export interface Gift {
  id: string;
  author_id: string;
  title: string;
  body: string;
  theme: Theme;
  image_paths: string[];
  updated_at?: string;
  published_at?: string;
  author_name?: string;
}
export interface Question {
  id: string;
  prompt: string;
  options: string[];
  answer: number | null;
}
export interface QuizDraft {
  title: string;
  questions: Question[];
}
export interface Publication {
  id: string;
  share_token: string;
  title: string;
  active: boolean;
}
export interface PublicQuiz {
  id: string;
  title: string;
  questions: Omit<Question, "answer">[];
}
export interface Receipt {
  id: string;
  score: number;
  total: number;
}
export interface Submission extends Receipt {
  nickname: string;
  answers: Record<string, number>;
  submitted_at: string;
  reward_status: "pending" | "prepared" | "given";
  quiz_title: string;
  questions: Question[];
}
export interface CottageApi {
  getInfo(): Promise<EventInfo>;
  getMember(): Promise<Member | null>;
  setLocale(userId: string, locale: Locale): Promise<void>;
  signIn(handle: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  listDrafts(): Promise<Gift[]>;
  saveGift(gift: Gift): Promise<void>;
  publishGift(id: string): Promise<void>;
  withdrawGift(id: string): Promise<void>;
  gallery(): Promise<Gift[]>;
  uploadImage(file: File): Promise<string>;
  imageUrl(path: string): Promise<string>;
  getQuizDraft(): Promise<QuizDraft | null>;
  saveQuizDraft(draft: QuizDraft): Promise<void>;
  publishQuiz(): Promise<Publication>;
  getPublication(): Promise<Publication | null>;
  closeQuiz(): Promise<void>;
  publicQuiz(token: string): Promise<PublicQuiz>;
  submitQuiz(
    token: string,
    nickname: string,
    answers: Record<string, number>,
    requestId: string,
  ): Promise<Receipt>;
  results(): Promise<Submission[]>;
  reward(id: string, status: Submission["reward_status"]): Promise<void>;
}
