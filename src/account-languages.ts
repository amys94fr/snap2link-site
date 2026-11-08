/** The app's languages, each in its own name so anyone can find theirs. Keep in step with the app's `src/i18n/languages.ts`. */
export const LANGUAGES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "en", name: "English" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
  { code: "es", name: "Español" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "hi", name: "हिन्दी" },
  { code: "tr", name: "Türkçe" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "it", name: "Italiano" },
  { code: "pl", name: "Polski" },
  { code: "ar", name: "العربية" },
  { code: "he", name: "עברית" },
  { code: "fa", name: "فارسی" },
];

const RTL = new Set(["ar", "he", "fa"]);

export function isRtl(code: string): boolean {
  return RTL.has(code);
}

/** The closest shipped language to a browser's, such as `pt` or `zh-HK`. */
export function closestLanguage(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const exact = LANGUAGES.find((language) => language.code === code);
  if (exact) return exact.code;
  const base = code.split("-")[0].toLowerCase();
  if (base === "zh") return /TW|HK|MO|Hant/i.test(code) ? "zh-TW" : "zh-CN";
  if (base === "pt") return "pt-BR";
  return LANGUAGES.find((language) => language.code === base)?.code;
}
