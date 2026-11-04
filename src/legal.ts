/**
 * Facts shared by the legal pages, in both languages. `contact@` and `abuse@`
 * have to receive mail before these pages go live.
 */
export const LEGAL = {
  updated: { en: "5 November 2026", fr: "5 novembre 2026" },
  publisher: "Steven Abittan",
  contact: "contact@snap2link.app",
  abuse: "abuse@snap2link.app",
  based: { en: "an individual based in Israel", fr: "un particulier établi en Israël" },
  authority: {
    en: "Israel's Privacy Protection Authority, or the data protection authority of the country where you live",
    fr: "l’autorité israélienne de protection de la vie privée, ou l’autorité de protection des données du pays où vous vivez (la CNIL en France)",
  },
  law: { en: "the law of Israel", fr: "le droit israélien" },
  host: {
    name: "Cloudflare, Inc.",
    address: "101 Townsend St, San Francisco, CA 94107, USA",
  },
} as const;

export const PAGES = {
  en: { privacy: "/privacy/", terms: "/terms/", legal: "/legal/" },
  fr: {
    privacy: "/fr/confidentialite/",
    terms: "/fr/conditions/",
    legal: "/fr/mentions-legales/",
  },
} as const;
