import { LANGUAGES, isRtl } from "../account-languages";
import { PAGES } from "../legal";
import en from "./site/en.json";

/**
 * The home page in the app's 20 languages. English lives at `/`, every other
 * language under its own folder, such as `/fr/` or `/pt-br/`, so each one can
 * be found by search engines. The legal pages exist in English and French
 * only: the other languages link to the English ones.
 */

export type Strings = typeof en;
export type Key = keyof Strings;

const files = import.meta.glob<{ default: Strings }>("./site/*.json", { eager: true });

export const SITE_LANGUAGES = LANGUAGES;
export const DEFAULT_LANGUAGE = "en";

export function strings(code: string): Strings {
  const file = files[`./site/${code}.json`];
  if (!file) throw new Error(`No site strings for ${code}`);
  return file.default;
}

/** `/` for English, `/pt-br/` for Brazilian Portuguese. */
export function homePath(code: string): string {
  return code === DEFAULT_LANGUAGE ? "/" : `/${code.toLowerCase()}/`;
}

/** Replaces `{name}` with its value. */
export function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

export function direction(code: string): "rtl" | "ltr" {
  return isRtl(code) ? "rtl" : "ltr";
}

/** The legal pages in this language, or in English when they aren't translated. */
export function legalPages(code: string) {
  return code === "fr"
    ? { ...PAGES.fr, report: `${PAGES.fr.legal}#signaler` }
    : { ...PAGES.en, report: `${PAGES.en.legal}#report` };
}

/** `og:locale` wants `fr_FR`, `pt_BR`, `zh_TW`. */
const OG_LOCALES: Record<string, string> = {
  en: "en_US", fr: "fr_FR", de: "de_DE", es: "es_ES", it: "it_IT", "pt-BR": "pt_BR", pl: "pl_PL",
  tr: "tr_TR", ru: "ru_RU", uk: "uk_UA", id: "id_ID", vi: "vi_VN", hi: "hi_IN", ar: "ar_AR",
  he: "he_IL", fa: "fa_IR", ja: "ja_JP", ko: "ko_KR", "zh-CN": "zh_CN", "zh-TW": "zh_TW",
};

export function ogLocale(code: string): string {
  return OG_LOCALES[code] ?? "en_US";
}

/** Every language's home page, for `hreflang` links. */
export function homeAlternates(): { hreflang: string; path: string }[] {
  return [
    ...SITE_LANGUAGES.map(({ code }) => ({ hreflang: code, path: homePath(code) })),
    { hreflang: "x-default", path: "/" },
  ];
}

/** Where a visitor without a saved choice lands, from the browser's languages. */
export const LANGUAGE_KEY = "snap2link-language";
