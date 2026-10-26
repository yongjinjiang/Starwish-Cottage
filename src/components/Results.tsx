import { useI18n } from "../lib/i18n";
import { useEffect, useState } from "react";
import { Gift, LockKeyhole, RefreshCw, Users } from "lucide-react";
import { TIMEZONE, errorMessage } from "../lib/domain";
import type { CottageApi, Submission } from "../lib/types";
import { Empty, Loading, Notice } from "./shared";
export function Results({ api }: { api: CottageApi }) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await api.results());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    api
      .results()
      .then((v) => {
        if (active) setRows(v);
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
  async function reward(id: string, status: Submission["reward_status"]) {
    setBusy(id);
    setError("");
    try {
      await api.reward(id, status);
      setRows((v) =>
        v.map((r) => (r.id === id ? { ...r, reward_status: status } : r)),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("JUST BETWEEN YOU AND YOUR FRIENDS")}</p>
          <h1>{t("生日问答结果")}</h1>
          <p>{t("Sonya，这是朋友们送回来的小默契。")}</p>
        </div>
        <button
          className="button secondary"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {t("刷新结果")}
        </button>
      </div>
      <div className="private-note">
        <LockKeyhole size={17} />
        {t("只有你可以查看，不受生日揭晓时间影响。")}
      </div>
      {error && <Notice error>{error}</Notice>}
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="stats-grid">
            <div className="panel stat">
              <Users />
              <strong>{rows.length}</strong>
              <span>{t("份朋友的回答")}</span>
            </div>
            <div className="panel stat">
              <Gift />
              <strong>
                {rows.filter((r) => r.reward_status === "given").length}
              </strong>
              <span>{t("份已送出的礼物")}</span>
            </div>
          </div>
          {rows.length ? (
            <div className="results-list">
              {rows.map((row) => (
                <article className="panel result-card" key={row.id}>
                  <div className="result-top">
                    <div>
                      <h2>{row.nickname}</h2>
                      <p>
                        {row.quiz_title} ·{" "}
                        {new Date(row.submitted_at).toLocaleString(
                          locale === "en" ? "en-US" : "zh-CN",
                          {
                            timeZone: TIMEZONE,
                          },
                        )}
                      </p>
                    </div>
                    <strong>
                      {row.score}
                      <small> / {row.total}</small>
                    </strong>
                  </div>
                  <label className="reward-label">
                    {t("小礼物")}
                    <select
                      aria-label={t("小礼物状态")}
                      value={row.reward_status}
                      disabled={busy === row.id}
                      onChange={(e) =>
                        void reward(
                          row.id,
                          e.target.value as Submission["reward_status"],
                        )
                      }
                    >
                      <option value="pending">{t("等待准备")}</option>
                      <option value="prepared">{t("礼物已准备")}</option>
                      <option value="given">{t("已经送出 ♥")}</option>
                    </select>
                  </label>
                  <details>
                    <summary>{t("看看每道题的回答")}</summary>
                    {row.questions.map((q) => (
                      <div className="answer-review" key={q.id}>
                        <strong>{q.prompt}</strong>
                        <p>
                          {t("朋友选择：")}
                          {q.options[row.answers[q.id]] ?? t("未选择")}
                        </p>
                        <p>
                          {t("正确答案：")}
                          {q.answer === null ? "—" : q.options[q.answer]}
                        </p>
                      </div>
                    ))}
                  </details>
                </article>
              ))}
            </div>
          ) : (
            <Empty title={t("第一颗回应的星，还在路上")}>
              {t("发布问答，把邀请链接分享给朋友，他们的回答就会出现在这里。")}
            </Empty>
          )}
        </>
      )}
    </section>
  );
}
