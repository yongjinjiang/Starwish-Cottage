import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  ImagePlus,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { errorMessage, validImage } from "../lib/domain";
import type { CottageApi, Gift, Member, Theme } from "../lib/types";
import { ArtImage, Empty, GiftPage, Loading, Notice } from "./shared";
export function FamilyStudio({
  api,
  member,
  revealed,
}: {
  api: CottageApi;
  member: Member;
  revealed: boolean;
}) {
  const [drafts, setDrafts] = useState<Gift[]>([]);
  const [gift, setGift] = useState<Gift | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  async function refresh() {
    setDrafts(await api.listDrafts());
  }
  useEffect(() => {
    let active = true;
    api
      .listDrafts()
      .then((v) => {
        if (active) setDrafts(v);
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api, member.user_id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(value: Partial<Gift>) {
    setGift((g) => (g ? { ...g, ...value } : g));
    setDirty(true);
    setMessage("");
  }
  async function run(action: "save" | "publish" | "withdraw") {
    if (!gift) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action !== "withdraw") await api.saveGift(gift);
      if (action === "publish") await api.publishGift(gift.id);
      if (action === "withdraw") await api.withdrawGift(gift.id);
      await refresh();
      setDirty(false);
      setGift((g) =>
        g
          ? {
              ...g,
              published_at:
                action === "publish"
                  ? new Date().toISOString()
                  : action === "withdraw"
                    ? undefined
                    : g.published_at,
            }
          : g,
      );
      setMessage(
        action === "save"
          ? "草稿已保存，只有你能看到。"
          : action === "withdraw"
            ? "作品已撤回，大家暂时看不到它。"
            : revealed
              ? "作品已发布，家人现在可以看到了。"
              : "已放进生日惊喜，10 月 26 日晚 6 点一起揭晓。",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file || !gift) return;
    if (gift.image_paths.length >= 5) {
      setError("每页最多放 5 张图片。");
      return;
    }
    if (!validImage(file)) {
      setError("请选择不超过 5 MB 的 JPG、PNG 或 WebP 图片。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const p = await api.uploadImage(file);
      update({ image_paths: [...gift.image_paths, p] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function leave() {
    if (dirty && !window.confirm("还有未保存的修改。确定离开这份草稿吗？"))
      return;
    setGift(null);
    setDirty(false);
    setError("");
    setMessage("");
  }
  if (loading) return <Loading />;
  return (
    <section className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MADE WITH LOVE, BY YOU</p>
          <h1>{gift ? "把心意写下来" : "我的创作小桌"}</h1>
          <p>
            {gift
              ? "一封信、一幅画、一句藏了很久的赞美，都很好。"
              : `${member.display_name}，这里是你为 Sonya 准备惊喜的地方。`}
          </p>
        </div>
        {gift ? (
          <button className="button secondary" onClick={leave}>
            <ArrowLeft size={17} /> 所有草稿
          </button>
        ) : (
          <button
            className="button primary"
            onClick={() => {
              setGift({
                id: crypto.randomUUID(),
                author_id: member.user_id,
                title: "",
                body: "",
                theme: "starlight",
                image_paths: [],
              });
              setDirty(false);
              setMessage("");
            }}
          >
            <Plus size={17} /> 新建一份心意
          </button>
        )}
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {!gift ? (
        <>
          <div className="hint-line">
            保存留给自己，发布留给生日。未发布的草稿会一直保密。
          </div>
          {drafts.length ? (
            <div className="draft-grid">
              {drafts.map((g) => (
                <button
                  className={`draft-card theme-${g.theme}`}
                  key={g.id}
                  onClick={() => {
                    setGift(g);
                    setError("");
                    setMessage("");
                    setDirty(false);
                  }}
                >
                  <span className="status-pill">
                    {g.published_at ? "已发布 · 可继续编辑" : "私密草稿"}
                  </span>
                  <h2>{g.title || "还没起名字的心意"}</h2>
                  <p>{g.body.slice(0, 90) || "一份等待被填满的心意。"}</p>
                  <span className="text-link">继续创作 ↗</span>
                </button>
              ))}
            </div>
          ) : (
            <Empty title="第一份心意，从这里开始">
              写一封生日信，或上传你亲手画的画。
            </Empty>
          )}
        </>
      ) : (
        <div className="editor-layout">
          <div className="panel editor">
            <label>
              作品标题
              <input
                maxLength={120}
                value={gift.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="例如：送给我最爱的妹妹"
              />
            </label>
            <label>
              想对 Sonya 说的话
              <textarea
                rows={12}
                maxLength={10000}
                value={gift.body}
                onChange={(e) => update({ body: e.target.value })}
                placeholder="亲爱的 Sonya，\n我最欣赏你的一点是……"
              />
            </label>
            <span className="field-note">
              {gift.body.length}/10000 · 文字会按你的换行展示
            </span>
            <label>
              挑一种心情色彩
              <select
                value={gift.theme}
                onChange={(e) => update({ theme: e.target.value as Theme })}
              >
                <option value="starlight">暖暖星光</option>
                <option value="garden">花园来信</option>
                <option value="moon">月亮晚安</option>
              </select>
            </label>
            <div className="image-list">
              {gift.image_paths.map((p, i) => (
                <div key={p}>
                  <ArtImage
                    api={api}
                    objectPath={p}
                    alt={`已上传作品 ${i + 1}`}
                  />
                  <button
                    className="icon-button"
                    aria-label={`移除第 ${i + 1} 张图片`}
                    disabled={busy}
                    onClick={() =>
                      update({
                        image_paths: gift.image_paths.filter((x) => x !== p),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <label className="upload-button">
              <ImagePlus size={19} />
              {busy ? "正在处理…" : "添加绘画或照片"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy || gift.image_paths.length >= 5}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="field-note">
              最多 5 张，每张不超过 5 MB。图片随作品一起私密保存。
            </p>
          </div>
          <aside className="panel editor-aside">
            <SparkleStamp />
            <h2>一份心意，慢慢写</h2>
            <p>
              保存不会提前公开。发布后的作品会在约定时刻，与大家的祝福一起出现。
            </p>
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() => setPreview(true)}
            >
              <Eye size={17} /> 预览作品
            </button>
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() => void run("save")}
            >
              <Save size={17} /> {busy ? "正在保存…" : "保存草稿"}
            </button>
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => void run("publish")}
            >
              <Send size={17} /> {revealed ? "发布给全家" : "发布到生日时刻"}
            </button>
            {gift.published_at && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "撤回后，家人将无法继续打开这份作品。确定撤回吗？",
                    )
                  )
                    void run("withdraw");
                }}
              >
                撤回已发布的作品
              </button>
            )}
            <p className="field-note">
              {dirty
                ? "还有未保存的修改"
                : "每一次发布，都会保存一份独立的展示版本。"}
            </p>
          </aside>
        </div>
      )}
      {preview && gift && (
        <GiftPage
          api={api}
          gift={{ ...gift, author_name: member.display_name }}
          onClose={() => setPreview(false)}
        />
      )}
    </section>
  );
}
function SparkleStamp() {
  return (
    <div className="sparkle-stamp" aria-hidden="true">
      ✧
    </div>
  );
}
