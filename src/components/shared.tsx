import { useEffect, useState, type ReactNode } from "react";
import {
  AlertCircle,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  X,
} from "lucide-react";
import { countdown } from "../lib/domain";
import type { CottageApi, Gift } from "../lib/types";
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`notice ${error ? "error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> 正在打开小屋…
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
  return (
    <section className="gate panel">
      <LockKeyhole size={34} />
      <p className="eyebrow">A LITTLE SPACE, JUST FOR FAMILY</p>
      <h1>
        {sonya ? "这是 Sonya 的私密页面" : "用你的家庭账号，推开小屋的门"}
      </h1>
      <p>
        {sonya
          ? "问答结果只向 Sonya 开放，家人账号也无法查看。"
          : "这里收藏着家人的心意，仅向受邀家庭成员开放。"}
      </p>
      <button className="button primary" onClick={onLogin}>
        家庭成员登录
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
  const values = countdown(revealAt, now);
  return (
    <div className="countdown" aria-label="距离生日揭晓的时间">
      {values.map((v, i) => (
        <div key={i}>
          <strong>{String(v).padStart(2, "0")}</strong>
          <span>{["天", "时", "分", "秒"][i]}</span>
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
    <p className="image-error">图片暂时无法加载，请稍后重试。</p>
  ) : url ? (
    <img className="art-image" src={url} alt={alt} loading="lazy" />
  ) : (
    <div className="image-placeholder" aria-label="图片加载中" />
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
          aria-label="关闭作品"
          onClick={onClose}
          autoFocus
        >
          <X />
        </button>
        <span className="eyebrow">A LITTLE GIFT FOR SONYA</span>
        <h1 id="gift-title">{gift.title || "还没起名字的心意"}</h1>
        <p className="gift-author">
          来自 {gift.author_name || "你的家人"}，带着满满的爱
        </p>
        <div className="gift-body">{gift.body}</div>
        {gift.image_paths.map((p, i) => (
          <ArtImage
            key={p}
            api={api}
            objectPath={p}
            alt={`${gift.title} · 作品 ${i + 1}`}
          />
        ))}
        <div className="gift-signoff">愿你的每一个心愿，都有星光回应。 ✧</div>
      </section>
    </div>
  );
}
