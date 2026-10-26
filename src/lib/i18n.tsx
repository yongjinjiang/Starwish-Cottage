import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  accountLocale,
  browserLocale,
  GUEST_LOCALE_KEY,
  isLocale,
  translate,
  type Locale,
} from "./locale";
import type { CottageApi, Member } from "./types";
function guestLocale(): Locale {
  try {
    const saved = localStorage.getItem(GUEST_LOCALE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* Storage may be disabled. */
  }
  return browserLocale(navigator.languages ?? [navigator.language]);
}
type I18n = {
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
  activateAccount: (member: Member | null) => void;
  changeLocale: (locale: Locale) => void;
  saveStatus: "saving" | "saved" | "error" | null;
};
const Context = createContext<I18n | null>(null);
export function I18nProvider({
  api,
  children,
}: {
  api: CottageApi;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(guestLocale);
  const [saveStatus, setSaveStatus] = useState<I18n["saveStatus"]>(null);
  const account = useRef<Member | null>(null);
  const generation = useRef(0);
  const queue = useRef(Promise.resolve());
  const activateAccount = useCallback((member: Member | null) => {
    if (account.current?.user_id === member?.user_id) return;
    account.current = member;
    generation.current++;
    setLocale(member ? accountLocale(member) : guestLocale());
    setSaveStatus(null);
  }, []);
  const changeLocale = useCallback(
    (next: Locale) => {
      if (!isLocale(next)) return;
      setLocale(next);
      const member = account.current;
      const request = ++generation.current;
      if (!member) {
        try {
          localStorage.setItem(GUEST_LOCALE_KEY, next);
        } catch {
          /* The current page still works without storage. */
        }
        setSaveStatus(null);
        return;
      }
      setSaveStatus("saving");
      // Serialize writes: a slower earlier selection cannot overwrite the latest.
      // Pass the captured user ID, so a queued save cannot affect another login.
      queue.current = queue.current
        .catch(() => {})
        .then(async () => {
          if (account.current?.user_id !== member.user_id) return;
          try {
            await api.setLocale(member.user_id, next);
            if (generation.current === request) setSaveStatus("saved");
          } catch {
            if (generation.current === request) setSaveStatus("error");
          }
        });
    },
    [api],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === "en"
        ? "Starwish Cottage · Sonya’s Birthday"
        : "星愿小屋 · Starwish Cottage";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", translate(locale, "收藏心愿，也收藏爱。"));
  }, [locale]);
  return (
    <Context.Provider
      value={{
        locale,
        t: (key, values) => translate(locale, key, values),
        activateAccount,
        changeLocale,
        saveStatus,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error("I18nProvider is required");
  return value;
}
export function LanguageSwitcher() {
  const { locale, changeLocale, t } = useI18n();
  return (
    <div className="language-switcher" role="group" aria-label={t("界面语言")}>
      <button
        type="button"
        lang="en"
        aria-pressed={locale === "en"}
        onClick={() => changeLocale("en")}
      >
        English
      </button>
      <span aria-hidden="true">|</span>
      <button
        type="button"
        lang="zh-CN"
        aria-pressed={locale === "zh-CN"}
        onClick={() => changeLocale("zh-CN")}
      >
        中文
      </button>
    </div>
  );
}
