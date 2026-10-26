import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  X,
} from "lucide-react";
import { useI18n, LanguageSwitcher } from "../lib/i18n";
import { countdown } from "../lib/domain";
import type { CottageApi, Gift } from "../lib/types";
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <AlertCircle size={18} />
      <span>{typeof children === "string" ? t(children) : children}</span>
    </div>
  );
}
export function Loading() {
  const { t } = useI18n();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      {t("正在打开小屋…")}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Sparkles size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function PrivateGate({
  sonya = false,
  onLogin,
}: {
  sonya?: boolean;
  onLogin: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="gate panel">
      <LockKeyhole size={34} />
      <p className="eyebrow">{t("A LITTLE SPACE, JUST FOR FAMILY")}</p>
      <h1>
        {sonya ? t("这是 Sonya 的私密页面") : t("用你的家庭账号，推开小屋的门")}
      </h1>
      <p>
        {sonya
          ? t("问答结果只向 Sonya 开放，家人账号也无法查看。")
          : t("这里收藏着家人的心意，仅向受邀家庭成员开放。")}
      </p>
      <button className="button primary" onClick={onLogin}>
        {t("家庭成员登录")}
      </button>
    </section>
  );
}
export function Countdown({
  revealAt,
  now,
}: {
  revealAt: string;
  now: number;
}) {
  const { t } = useI18n();
  const values = countdown(revealAt, now);
  return (
    <div className="countdown" aria-label={t("距离生日揭晓的时间")}>
      {values.map((v, i) => (
        <div key={i}>
          <strong>{String(v).padStart(2, "0")}</strong>
          <span>{t(["天", "时", "分", "秒"][i])}</span>
        </div>
      ))}
    </div>
  );
}
export function ArtImage({
  api,
  objectPath,
  alt,
}: {
  api: CottageApi;
  objectPath: string;
  alt: string;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .imageUrl(objectPath)
        .then((v) => {
          if (active) {
            setUrl(v);
            setError(false);
          }
        })
        .catch(() => {
          if (active) setError(true);
        });
    void load();
    const timer = window.setInterval(load, 50000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, objectPath]);
  return error ? (
    <p className="image-error">{t("图片暂时无法加载，请稍后重试。")}</p>
  ) : url ? (
    <img className="art-image" src={url} alt={alt} loading="lazy" />
  ) : (
    <div className="image-placeholder" aria-label={t("图片加载中")} />
  );
}
export function GiftPage({
  api,
  gift,
  onClose,
}: {
  api: CottageApi;
  gift: Gift;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="modal-backdrop">
      <section
        className={`gift-page theme-${gift.theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-title"
      >
        <button
          className="icon-button close"
          aria-label={t("关闭作品")}
          onClick={onClose}
          autoFocus
        >
          <X />
        </button>
        <LanguageSwitcher />
        <span className="eyebrow">{t("A LITTLE GIFT FOR SONYA")}</span>
        <h1 id="gift-title">{gift.title || t("还没起名字的心意")}</h1>
        <p className="gift-author">
          {t("来自 {{name}}，带着满满的爱", {
            name: t(gift.author_name || "你的家人"),
          })}
        </p>
        <div className="gift-body">{gift.body}</div>
        {gift.image_paths.map((p, i) => (
          <ArtImage
            key={p}
            api={api}
            objectPath={p}
            alt={t("{{title}} · 作品 {{n}}", { title: gift.title, n: i + 1 })}
          />
        ))}
        <div className="gift-signoff">
          {t("愿你的每一个心愿，都有星光回应。 ✧")}
        </div>
      </section>
    </div>
  );
}
