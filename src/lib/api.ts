import { supabase } from "./supabase";
import { HANDLES, type CottageApi, type Gift, type Member } from "./types";
import { validImage } from "./domain";
function db() {
  if (!supabase)
    throw new Error("家庭小屋还没有连接数据库，请先完成部署设置。");
  return supabase;
}
async function rpc<T>(name: string, args = {}): Promise<T> {
  const { data, error } = await db().rpc(name, args);
  if (error) throw error;
  return data as T;
}
async function member(): Promise<Member | null> {
  const {
    data: { session },
  } = await db().auth.getSession();
  if (!session) return null;
  const { data, error } = await db()
    .from("family_members")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    await db().auth.signOut();
    throw new Error("family_only");
  }
  return data as Member;
}
async function userId() {
  const current = await member();
  if (!current) throw new Error("family_only");
  return current.user_id;
}
export const realApi: CottageApi = {
  getInfo: () => rpc("cottage_info"),
  getMember: member,
  async signIn(handle, password) {
    const canonical = HANDLES.find(
      (h) => h.toLowerCase() === handle.trim().toLowerCase(),
    );
    if (!canonical) throw new Error("Invalid login credentials");
    const { error } = await db().auth.signInWithPassword({
      email: `${canonical.toLowerCase()}@family.starwish.example`,
      password,
    });
    if (error) throw error;
    if (!(await member())) throw new Error("family_only");
  },
  async signOut() {
    const { error } = await db().auth.signOut();
    if (error) throw error;
  },
  async listDrafts() {
    const [drafts, publications] = await Promise.all([
      db()
        .from("gift_drafts")
        .select("*")
        .order("updated_at", { ascending: false }),
      db().from("gift_publications").select("id,published_at"),
    ]);
    if (drafts.error) throw drafts.error;
    if (publications.error) throw publications.error;
    return (drafts.data as Gift[]).map((g) => ({
      ...g,
      published_at: publications.data.find((p) => p.id === g.id)?.published_at,
    }));
  },
  async saveGift(gift) {
    const { error } = await db()
      .from("gift_drafts")
      .upsert({
        id: gift.id,
        author_id: await userId(),
        title: gift.title,
        body: gift.body,
        theme: gift.theme,
        image_paths: gift.image_paths,
      });
    if (error) throw error;
  },
  publishGift: (id) => rpc("publish_gift", { p_id: id }),
  withdrawGift: (id) => rpc("withdraw_gift", { p_id: id }),
  gallery: () => rpc("family_gallery"),
  async uploadImage(file) {
    if (!validImage(file))
      throw new Error("请选择不超过 5 MB 的 JPG、PNG 或 WebP 图片。");
    const ext = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[file.type];
    const objectPath = `${await userId()}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db()
      .storage.from("family-art")
      .upload(objectPath, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return objectPath;
  },
  async imageUrl(objectPath) {
    const { data, error } = await db()
      .storage.from("family-art")
      .createSignedUrl(objectPath, 60);
    if (error) throw error;
    return data.signedUrl;
  },
  async getQuizDraft() {
    const { data, error } = await db()
      .from("quiz_drafts")
      .select("title,questions")
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async saveQuizDraft(draft) {
    const { error } = await db()
      .from("quiz_drafts")
      .upsert(
        { owner_id: await userId(), ...draft },
        { onConflict: "owner_id" },
      );
    if (error) throw error;
  },
  publishQuiz: () => rpc("publish_quiz"),
  async getPublication() {
    const { data, error } = await db()
      .from("quiz_publications")
      .select("id,share_token,title,active")
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  closeQuiz: () => rpc("close_quiz"),
  publicQuiz: (token) => rpc("get_public_quiz", { p_token: token }),
  submitQuiz: (token, nickname, answers, requestId) =>
    rpc("submit_quiz", {
      p_token: token,
      p_nickname: nickname,
      p_answers: answers,
      p_request_id: requestId,
    }),
  results: () => rpc("quiz_results"),
  async reward(id, status) {
    const { error } = await db()
      .from("quiz_submissions")
      .update({ reward_status: status })
      .eq("id", id)
      .select("id")
      .single();
    if (error) throw error;
  },
};
