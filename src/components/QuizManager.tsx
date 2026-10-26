import { useI18n } from "../lib/i18n";
import { useEffect, useState } from "react";
import { Copy, Plus, Save, Send, Trash2 } from "lucide-react";
import { newQuizTemplate } from "../data/template";
import { errorMessage, validateQuiz } from "../lib/domain";
import type { CottageApi, Publication, QuizDraft } from "../lib/types";
import { Loading, Notice } from "./shared";
export function QuizManager({
  api,
  preview,
}: {
  api: CottageApi;
  preview: boolean;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState<QuizDraft>(() => newQuizTemplate(locale));
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([api.getQuizDraft(), api.getPublication()])
      .then(([d, p]) => {
        if (active) {
          if (d) setDraft(d);
          setPublication(p);
        }
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
  }, [api]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const link = publication
    ? `${location.origin}/${preview ? "?preview=1" : ""}#quiz/${publication.share_token}`
    : "";
  function update(value: QuizDraft) {
    setDraft(value);
    setDirty(true);
    setMessage("");
  }
  function question(index: number, field: string, value: unknown) {
    update({
      ...draft,
      questions: draft.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q,
      ),
    });
  }
  async function save(publish = false) {
    setError("");
    setMessage("");
    if (publish) {
      const reason = validateQuiz(draft);
      if (reason) {
        setError(reason);
        return;
      }
      if (
        publication &&
        !window.confirm(
          t(
            "重新发布会生成新链接，旧链接停止接收答题。已有成绩会保留。继续吗？",
          ),
        )
      )
        return;
    }
    setBusy(true);
    try {
      await api.saveQuizDraft(draft);
      if (publish) setPublication(await api.publishQuiz());
      setDirty(false);
      setMessage(
        publish ? "问答已发布！把专属链接分享给朋友吧。" : "题目草稿已保存。",
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  return (
    <section className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("HOW WELL DO YOU KNOW SONYA?")}</p>
          <h1>{t("Sonya 的生日问答")}</h1>
          <p>{t("从家人为你准备的模板开始，出一道只有好朋友才懂的题。")}</p>
        </div>
        <a className="button secondary" href="#results">
          {t("查看答题结果 ↗")}
        </a>
      </div>
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {publication && (
        <section className="share-panel panel">
          <div>
            <span className="status-pill">{t("朋友可以参与了")}</span>
            <h2>{t("把这份邀请，送给你的朋友")}</h2>
            <p>{t("这条链接只开放问答，家庭作品与成绩名单仍然保密。")}</p>
          </div>
          <div className="share-link">
            <input aria-label={t("问答分享链接")} readOnly value={link} />
            <button
              className="button secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(link)
                  .then(() => setMessage("邀请链接已复制。"))
                  .catch(() => setError("请选中链接，手动复制。"));
              }}
            >
              <Copy size={16} />
              {t("复制")}
            </button>
          </div>
          <div className="inline-actions">
            <a href={link} className="text-link">
              {t("打开朋友答题页面 ↗")}
            </a>
            <button
              className="text-button"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    t("关闭后，朋友将无法继续答题。已有结果会保留。"),
                  )
                )
                  return;
                setBusy(true);
                try {
                  await api.closeQuiz();
                  setPublication(null);
                  setMessage("问答已关闭，结果继续保留。");
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("关闭当前链接")}
            </button>
          </div>
        </section>
      )}
      <div className="editor-layout">
        <div>
          <section className="panel editor">
            <label>
              {t("问答标题")}
              <input
                maxLength={120}
                value={draft.title}
                onChange={(e) => update({ ...draft, title: e.target.value })}
              />
            </label>
            <p className="field-note">
              {t("模板里的选项和正确答案需要你亲自填写。每题单选。")}
            </p>
          </section>
          {draft.questions.map((q, i) => (
            <section className="panel question-editor" key={q.id}>
              <div className="question-top">
                <span className="eyebrow">
                  {t("QUESTION")}
                  {String(i + 1).padStart(2, "0")}
                </span>
                <button
                  className="icon-button"
                  aria-label={t("删除第 {{n}} 题", { n: i + 1 })}
                  disabled={draft.questions.length <= 1 || busy}
                  onClick={() =>
                    update({
                      ...draft,
                      questions: draft.questions.filter((_, n) => n !== i),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label>
                {t("第 {{n}} 题", { n: i + 1 })}
                <input
                  maxLength={500}
                  value={q.prompt}
                  onChange={(e) => question(i, "prompt", e.target.value)}
                />
              </label>
              <fieldset className="option-editor">
                <legend>{t("编辑选项，并勾选正确答案")}</legend>
                {q.options.map((option, j) => (
                  <div key={j}>
                    <input
                      type="radio"
                      name={`answer-${q.id}`}
                      aria-label={t("第 {{n}} 题正确答案 {{letter}}", {
                        n: i + 1,
                        letter: String.fromCharCode(65 + j),
                      })}
                      checked={q.answer === j}
                      onChange={() => question(i, "answer", j)}
                    />
                    <span>{String.fromCharCode(65 + j)}</span>
                    <input
                      aria-label={t("第 {{n}} 题选项 {{letter}}", {
                        n: i + 1,
                        letter: String.fromCharCode(65 + j),
                      })}
                      maxLength={200}
                      value={option}
                      onChange={(e) =>
                        question(
                          i,
                          "options",
                          q.options.map((v, n) =>
                            n === j ? e.target.value : v,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </fieldset>
            </section>
          ))}
          <button
            className="button secondary"
            disabled={draft.questions.length >= 12 || busy}
            onClick={() =>
              update({
                ...draft,
                questions: [
                  ...draft.questions,
                  {
                    id: crypto.randomUUID(),
                    prompt: "",
                    options: ["", "", "", ""],
                    answer: null,
                  },
                ],
              })
            }
          >
            <Plus size={17} />
            {t("添加一道题")}
          </button>
        </div>
        <aside className="panel editor-aside">
          <div className="sparkle-stamp">✧</div>
          <h2>{t("让朋友再了解你一点")}</h2>
          <p>
            {t(
              "可以问喜欢的书、食物、音乐和小梦想。生日问答没有倒计时，慢慢想就好。",
            )}
          </p>
          <button
            className="button secondary full"
            disabled={busy}
            onClick={() => void save()}
          >
            <Save size={17} />
            {t("保存题目草稿")}
          </button>
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => void save(true)}
          >
            <Send size={17} />{" "}
            {busy
              ? t("正在保存…")
              : publication
                ? t("发布新版本")
                : t("发布并生成链接")}
          </button>
          <p className="field-note">
            {dirty ? t("还有未保存的修改。") : t("正确答案仅用于服务端评分。")}
            <br />
            {t("每个发布版本最多接收 200 份提交。")}
          </p>
        </aside>
      </div>
    </section>
  );
}
