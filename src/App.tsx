import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BookHeart,
  Feather,
  Gift as GiftIcon,
  Heart,
  Home,
  LockKeyhole,
  LogOut,
  Menu,
  MoonStar,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { REVEAL_AT, TIMEZONE, errorMessage, isRevealed } from "./lib/domain";
import {
  HANDLES,
  type CottageApi,
  type EventInfo,
  type Gift,
  type Member,
} from "./lib/types";
import type { PreviewControls } from "./lib/preview";
import { configured, supabase } from "./lib/supabase";
import { CottageIllustration } from "./components/CottageIllustration";
import {
  Countdown,
  Empty,
  GiftPage,
  Loading,
  Notice,
  PrivateGate,
} from "./components/shared";
import { FamilyStudio } from "./components/FamilyStudio";
import { QuizManager } from "./components/QuizManager";
import { QuizPlayer } from "./components/QuizPlayer";
import { Results } from "./components/Results";
function route() {
  return location.hash.slice(1) || "home";
}
export default function App({
  api,
  previewControls,
}: {
  api: CottageApi;
  previewControls?: PreviewControls;
}) {
  const [view, setView] = useState(route);
  const [member, setMember] = useState<Member | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [login, setLogin] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState({
    server: Date.now(),
    mono: performance.now(),
  });
  const [now, setNow] = useState(Date.now());
  const [info, setInfo] = useState<EventInfo>({
    title: "Sonya 的十二岁生日",
    reveal_at: REVEAL_AT,
    timezone: TIMEZONE,
    server_now: new Date().toISOString(),
  });
  const [version, setVersion] = useState(0);
  const isConfigured = configured || Boolean(previewControls);
  async function reload() {
    if (!isConfigured) {
      setAuthLoading(false);
      return;
    }
    try {
      const [m, i] = await Promise.all([api.getMember(), api.getInfo()]);
      setMember(m);
      setInfo(i);
      setClock({ server: Date.parse(i.server_now), mono: performance.now() });
      setNow(Date.parse(i.server_now));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAuthLoading(false);
    }
  }
  useEffect(() => {
    const onHash = () => {
      setView(route());
      setMenu(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    void reload();
    const onFocus = () => void reload();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [api, version]);
  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(clock.server + performance.now() - clock.mono),
      1000,
    );
    return () => clearInterval(timer);
  }, [clock]);
  useEffect(() => {
    if (!supabase || previewControls) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setMember(null);
        location.hash = "home";
      }
      if (event === "SIGNED_IN") window.setTimeout(() => void reload(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [api]);
  useEffect(() => {
    if (!login) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLogin(false);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [login]);
  const revealed = isRevealed(info.reveal_at, now);
  const sonya = member?.role === "celebrant";
  async function logout() {
    try {
      await api.signOut();
      setMember(null);
      location.hash = "home";
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  let content;
  if (view.startsWith("quiz/"))
    content = <QuizPlayer key={view} api={api} token={view.slice(5)} />;
  else if (view === "studio")
    content = authLoading ? (
      <Loading />
    ) : member && member.role !== "celebrant" ? (
      <FamilyStudio
        key={member.user_id}
        api={api}
        member={member}
        revealed={revealed}
      />
    ) : (
      <PrivateGate onLogin={() => setLogin(true)} />
    );
  else if (view === "quiz-manage" || view === "results")
    content = authLoading ? (
      <Loading />
    ) : sonya ? (
      view === "results" ? (
        <Results key={member!.user_id} api={api} />
      ) : (
        <QuizManager
          key={member!.user_id}
          api={api}
          preview={Boolean(previewControls)}
        />
      )
    ) : (
      <PrivateGate sonya onLogin={() => setLogin(true)} />
    );
  else if (view === "gallery")
    content = (
      <Gallery
        key={member?.user_id || "guest"}
        api={api}
        member={member}
        revealed={revealed}
        info={info}
        now={now}
        onLogin={() => setLogin(true)}
      />
    );
  else if (view === "quiz")
    content = (
      <section className="gate panel">
        <span className="eyebrow">A LITTLE QUIZ, A LOT OF FRIENDSHIP</span>
        <h1>你有多了解 Sonya？</h1>
        <p>
          朋友请使用 Sonya 发给你的专属问答链接。
          <br />
          Sonya 可以在自己的工作台准备题目、发布邀请。
        </p>
        {sonya ? (
          <a className="button primary" href="#quiz-manage">
            准备生日问答 <ArrowRight size={17} />
          </a>
        ) : (
          <button className="button secondary" onClick={() => setLogin(true)}>
            Sonya 登录工作台
          </button>
        )}
      </section>
    );
  else
    content = (
      <HomePage
        member={member}
        revealed={revealed}
        info={info}
        now={now}
        onLogin={() => setLogin(true)}
      />
    );
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      {import.meta.env.DEV && previewControls && (
        <div className="preview-bar">
          <span>设计预览 · 示例环境 · 不保存真实信息</span>
          <label>
            预览身份
            <select
              aria-label="预览身份"
              defaultValue=""
              onChange={(e) => {
                previewControls.setIdentity(e.target.value);
                setVersion((v) => v + 1);
              }}
            >
              <option value="">访客</option>
              {HANDLES.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              onChange={(e) => {
                previewControls.setRevealed(e.target.checked);
                setVersion((v) => v + 1);
              }}
            />
            预览揭晓后
          </label>
        </div>
      )}
      <header className="site-header">
        <a className="brand" href="#home" aria-label="星愿小屋首页">
          <span className="brand-mark">
            <Home size={23} />
            <Star size={10} />
          </span>
          <span>
            <strong>星愿小屋</strong>
            <small>STARWISH COTTAGE</small>
          </span>
        </a>
        <button
          className="icon-button mobile-menu"
          aria-label="打开导航"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? "open" : ""} aria-label="主导航">
          <a className={view === "home" ? "active" : ""} href="#home">
            小屋首页
          </a>
          <a
            className={
              view === "quiz" ||
              view === "quiz-manage" ||
              view.startsWith("quiz/")
                ? "active"
                : ""
            }
            href="#quiz"
          >
            生日问答
          </a>
          <a className={view === "gallery" ? "active" : ""} href="#gallery">
            家人的心意 <span className="tiny-star">✧</span>
          </a>
          {member && member.role !== "celebrant" && (
            <a className={view === "studio" ? "active" : ""} href="#studio">
              我的创作
            </a>
          )}
          {sonya && (
            <a className={view === "results" ? "active" : ""} href="#results">
              问答结果
            </a>
          )}
        </nav>
        <div className="header-account">
          {member ? (
            <>
              <span className="member-name">
                <span className="avatar">
                  {member.display_name.slice(0, 1)}
                </span>
                {member.display_name}
              </span>
              <button
                className="icon-button"
                aria-label="退出登录"
                onClick={() => void logout()}
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <button
              className="button header-login"
              onClick={() => setLogin(true)}
            >
              <LockKeyhole size={15} /> 家人登录
            </button>
          )}
        </div>
      </header>
      <main id="main-content">
        {!isConfigured && (
          <div className="setup-notice">
            小屋正在布置中。连接 Supabase 后，即可使用家庭登录、发布与答题功能。
          </div>
        )}
        {error && (
          <div className="global-error">
            <Notice error>{error}</Notice>
          </div>
        )}
        {content}
      </main>
      <footer className="site-footer">
        <div>
          <span className="footer-star">✧</span>
          <strong>星愿小屋</strong>
          <span>收藏心愿，也收藏爱。</span>
        </div>
        <p>
          Made with love, for Sonya. <Heart size={12} />
        </p>
        <small>家庭作品仅向受邀成员开放 · 问答结果仅 Sonya 可见</small>
      </footer>
      {login && (
        <Login
          api={api}
          onClose={() => setLogin(false)}
          onSuccess={async () => {
            setLogin(false);
            await reload();
          }}
        />
      )}
    </>
  );
}
function HomePage({
  member,
  revealed,
  info,
  now,
  onLogin,
}: {
  member: Member | null;
  revealed: boolean;
  info: EventInfo;
  now: number;
  onLogin: () => void;
}) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">
            <span className="gold-dot" /> FOR SONYA’S 12TH BIRTHDAY
          </span>
          <h1>
            把心愿放进小屋，
            <br />
            等一场<span>星光满怀</span>。
          </h1>
          <p>
            一份份悄悄准备的心意，一句句想对你说的话。
            <br />
            亲爱的 Sonya，十二岁的你，值得所有美好。
          </p>
          <div className="hero-actions">
            <a
              className="button primary"
              href={member?.role === "celebrant" ? "#quiz-manage" : "#quiz"}
            >
              走进生日问答 <ArrowRight size={17} />
            </a>
            <a className="hero-text-link" href="#gallery">
              看看家人的心意 <Heart size={15} />
            </a>
          </div>
          <div className="family-byline">
            <div className="avatar-stack">
              {["S", "M", "A", "妈", "爸"].map((s, i) => (
                <span key={s} className={`family-avatar avatar-${i}`}>
                  {s}
                </span>
              ))}
            </div>
            <span>
              我们一起，为你点亮这一岁 <span>✧</span>
            </span>
          </div>
        </div>
        <div className="hero-art">
          <span className="art-caption">
            <Star size={13} /> Every wish has a little home.
          </span>
          <CottageIllustration />
          <span className="art-bottom-note">给 Sonya 的，第十二个秋天</span>
        </div>
      </section>
      <section className="reveal-banner">
        <div className="reveal-copy">
          <span className="eyebrow">
            <MoonStar size={15} /> OUR LITTLE BIRTHDAY SECRET
          </span>
          <h2>
            {revealed ? "星光到了，心意也到了。" : "有些惊喜，值得一起等待。"}
          </h2>
          <p>
            {revealed
              ? "家人的祝福已经揭晓，登录后一起打开吧。"
              : "2026 年 10 月 26 日 · 晚上 6:00 · 丹佛时间"}
          </p>
        </div>
        {revealed ? (
          <a className="button light" href="#gallery">
            打开生日惊喜 <Sparkles size={17} />
          </a>
        ) : (
          <Countdown revealAt={info.reveal_at} now={now} />
        )}
        <span className="banner-star star-a">✧</span>
        <span className="banner-star star-b">✦</span>
      </section>
      <section className="home-activities">
        <div className="section-title">
          <div>
            <p className="eyebrow">LITTLE THINGS, BIG LOVE</p>
            <h2>每一份参与，都是礼物</h2>
          </div>
          <p>属于 Sonya，也属于爱她的每一个人。</p>
        </div>
        <div className="activity-grid">
          <article className="activity-card quiz-card">
            <div className="card-top">
              <span className="activity-icon">
                <BookHeart size={27} />
              </span>
              <span className="mini-label">FOR FRIENDS</span>
            </div>
            <h3>你有多了解 Sonya？</h3>
            <p>
              喜欢的书、最爱的味道、藏在日常里的小偏好。
              <br />
              来试试你们之间的小默契吧。
            </p>
            <a
              href={member?.role === "celebrant" ? "#quiz-manage" : "#quiz"}
              className="card-link"
            >
              {member?.role === "celebrant"
                ? "出一道关于自己的题"
                : "打开生日问答"}{" "}
              <ArrowRight size={18} />
            </a>
            <span className="card-decoration" aria-hidden="true">
              ?
            </span>
          </article>
          <article className="activity-card wishes-card">
            <div className="card-top">
              <span className="activity-icon">
                <GiftIcon size={27} />
              </span>
              <span className="mini-label">JUST FOR FAMILY</span>
            </div>
            <h3>把爱，写成一份惊喜</h3>
            <p>
              一封信、一幅画、一首小诗。
              <br />
              家人的心意，会在约定时刻一起绽放。
            </p>
            {member && member.role !== "celebrant" ? (
              <a href="#studio" className="card-link">
                准备我的生日心意 <Feather size={18} />
              </a>
            ) : (
              <button
                className="card-link"
                onClick={
                  member
                    ? () => {
                        location.hash = "gallery";
                      }
                    : onLogin
                }
              >
                {member ? "等待家人的惊喜" : "家人登录，开始创作"}{" "}
                <Feather size={18} />
              </button>
            )}
            <span className="card-decoration" aria-hidden="true">
              ♡
            </span>
          </article>
        </div>
      </section>
      <section className="closing-note">
        <span>✧</span>
        <p>
          愿你一直好奇，一直勇敢，
          <br />
          一直被爱，也一直闪闪发光。
        </p>
        <small>TO OUR DEAR SONYA</small>
      </section>
    </>
  );
}
function Gallery({
  api,
  member,
  revealed,
  info,
  now,
  onLogin,
}: {
  api: CottageApi;
  member: Member | null;
  revealed: boolean;
  info: EventInfo;
  now: number;
  onLogin: () => void;
}) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Gift | null>(null);
  useEffect(() => {
    if (!member || !revealed) return;
    let active = true;
    setLoading(true);
    api
      .gallery()
      .then((v) => {
        if (active) setGifts(v);
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
  }, [api, member?.user_id, revealed]);
  if (!member) return <PrivateGate onLogin={onLogin} />;
  return (
    <section className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">EVERY PAGE, A LITTLE PIECE OF LOVE</p>
          <h1>家人的心意</h1>
          <p>
            {revealed
              ? "给 Sonya 的生日信、画作和小小心愿，都在这里。"
              : "惊喜已经藏好，等我们一起打开。"}
          </p>
        </div>
        {member.role !== "celebrant" && (
          <a href="#studio" className="button secondary">
            <Feather size={17} /> 我的创作小桌
          </a>
        )}
      </div>
      {error && <Notice error>{error}</Notice>}
      {!revealed ? (
        <div className="sealed-gallery panel">
          <div className="sealed-envelope">
            <Heart size={31} />
            <LockKeyhole size={20} />
          </div>
          <h2>写给你的爱，正在路上</h2>
          <p>所有已发布的作品，将在 10 月 26 日晚 6 点（丹佛时间）一起揭晓。</p>
          <Countdown revealAt={info.reveal_at} now={now} />
          <p className="field-note">未揭晓的文字与图片不会发送到你的浏览器。</p>
        </div>
      ) : loading ? (
        <Loading />
      ) : gifts.length ? (
        <div className="draft-grid">
          {gifts.map((g) => (
            <button
              key={g.id}
              className={`draft-card theme-${g.theme}`}
              onClick={() => setSelected(g)}
            >
              <span className="eyebrow">FROM {g.author_name}</span>
              <h2>{g.title}</h2>
              <p>{g.body.slice(0, 100)}</p>
              <span className="text-link">打开这份心意 ↗</span>
            </button>
          ))}
        </div>
      ) : (
        <Empty title="小屋的门已经打开">
          家人还没有发布作品。每一份准备好的心意，都会出现在这里。
        </Empty>
      )}
      {selected && (
        <GiftPage api={api} gift={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
function Login({
  api,
  onClose,
  onSuccess,
}: {
  api: CottageApi;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.signIn(handle, password);
      await onSuccess();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="login-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button
          className="icon-button close"
          aria-label="关闭登录"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="sparkle-stamp">✧</div>
        <p className="eyebrow">WELCOME HOME</p>
        <h2 id="login-title">欢迎回到星愿小屋</h2>
        <p>这里有一个，属于我们的小小秘密。</p>
        <form onSubmit={(e) => void submit(e)}>
          <label>
            家庭昵称
            <input
              autoFocus
              autoComplete="username"
              placeholder="例如 Mia14 或 sonya12"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              maxLength={32}
            />
          </label>
          <label>
            密码
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <Notice error>{error}</Notice>}
          <button className="button primary full" disabled={busy}>
            {busy ? "正在开门…" : "推开小屋的门"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="field-note">
          仅限受邀家庭账号。密码由家长管理，需要帮助请联系爸爸或妈妈。
        </p>
      </section>
    </div>
  );
}
