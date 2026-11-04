/**
 * Facts shared by the legal pages, in both languages.
 *
 * Every [TODO] must be filled in before these pages go live. `abuse@` also has
 * to receive mail first: the zone has no Email Routing yet.
 */
export const LEGAL = {
  updated: { en: "4 November 2026", fr: "4 novembre 2026" },
  publisher: "[TODO: full name, or company name and legal form]",
  address: "[TODO: postal address]",
  registration: "[TODO: company number and VAT number, or remove if an individual]",
  phone: "[TODO: phone number]",
  director: "[TODO: name of the publication director]",
  contact: "[TODO: contact address for legal and privacy questions]",
  abuse: "abuse@snap2link.app",
  authority: "[TODO: data protection authority, CNIL if established in France]",
  law: {
    en: "[TODO: governing law, for example French law]",
    fr: "[TODO : droit applicable, par exemple le droit français]",
  },
  host: {
    name: "Cloudflare, Inc.",
    address: "101 Townsend St, San Francisco, CA 94107, USA",
    phone: "[TODO: check Cloudflare's phone number]",
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
