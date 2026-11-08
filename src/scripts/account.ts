import english from "../account-locales/en.json";
import { closestLanguage, isRtl } from "../account-languages";

/**
 * The account area. The session lives in an HttpOnly cookie on the relay, so
 * this script never sees it: it only calls the relay and draws the answer.
 * Everything from the relay goes in through `textContent`.
 */

const RELAY = "https://i.snap2link.app";
const HOUR_MS = 3_600_000;
const COPIED_MS = 2000;
const SAVED_MS = 3000;
const RECENT_LINKS = 3;
const PAGES = ["overview", "links", "profile", "plan", "security", "settings", "help"] as const;
const LANGUAGE_KEY = "snap2link-language";

type Page = (typeof PAGES)[number];

interface Link {
  id: string;
  url: string;
  created_at: string;
  expires_at: string;
  pinned: boolean;
  /** Only in the demo: the picture to show instead of the link. */
  preview?: string;
}

interface Me {
  email: string;
  name: string;
  language: string;
  plan: string;
  captures_today: number;
  daily_captures: number;
  slots_used: number;
  slots: number;
}

interface History {
  captures: Link[];
  max_pins: number;
}

interface Session {
  id: string;
  kind: "app" | "web";
  created_at: string;
  current: boolean;
}

interface Api {
  me(): Promise<Me | null>;
  history(): Promise<History>;
  sessions(): Promise<Session[]>;
  sendCode(email: string, turnstile: string): Promise<void>;
  signInWithGoogle(credential: string): Promise<void>;
  verify(email: string, code: string): Promise<boolean>;
  saveProfile(profile: { name: string; language: string }): Promise<void>;
  sendEmailCode(email: string): Promise<void>;
  changeEmail(email: string, code: string): Promise<boolean>;
  pin(id: string, pinned: boolean): Promise<void>;
  remove(id: string): Promise<void>;
  closeSession(id: string): Promise<void>;
  closeOtherSessions(): Promise<void>;
  exportData(): Promise<Blob>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}

class ApiError extends Error {}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${RELAY}${path}`, { credentials: "include", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.error ?? String(response.status));
  }
  return response;
}

const send = (path: string, method: string, body: unknown) =>
  call(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

async function accepted(request: Promise<Response>): Promise<boolean> {
  try {
    await request;
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.message === "invalid_code") return false;
    throw e;
  }
}

const relayApi: Api = {
  async me() {
    try {
      return await (await call("/v1/me")).json();
    } catch (e) {
      if (e instanceof ApiError && e.message === "session_required") return null;
      throw e;
    }
  },
  history: async () => (await call("/v1/captures")).json(),
  sessions: async () => (await call("/v1/sessions")).json(),
  sendCode: async (email, turnstile) =>
    void (await send("/v1/web/login/code", "POST", { email, turnstile, language: lang })),
  verify: (email, code) => accepted(send("/v1/web/login/verify", "POST", { email, code })),
  signInWithGoogle: async (credential) =>
    void (await send("/v1/web/login/google", "POST", { credential })),
  saveProfile: async (profile) => void (await send("/v1/me", "PATCH", profile)),
  sendEmailCode: async (email) =>
    void (await send("/v1/me/email/code", "POST", { email, language: lang })),
  changeEmail: (email, code) => accepted(send("/v1/me/email", "PUT", { email, code })),
  pin: async (id, pinned) =>
    void (await call(`/v1/captures/${id}/pin`, { method: pinned ? "PUT" : "DELETE" })),
  remove: async (id) => void (await call(`/v1/captures/${id}`, { method: "DELETE" })),
  closeSession: async (id) => void (await call(`/v1/sessions/${id}`, { method: "DELETE" })),
  closeOtherSessions: async () => void (await call("/v1/sessions", { method: "DELETE" })),
  exportData: async () => (await call("/v1/me/export")).blob(),
  signOut: async () => void (await call("/v1/web/logout", { method: "POST" })),
  deleteAccount: async () => void (await call("/v1/me", { method: "DELETE" })),
};

/** Sample data for working on the pages: `?demo` in the dev server only. */
function demoApi(): Api {
  const now = Date.now();
  const picture = (hue: number) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="hsl(${hue} 30% 22%)"/><rect x="24" y="20" width="272" height="18" rx="4" fill="hsl(${hue} 30% 40%)"/><rect x="24" y="52" width="180" height="108" rx="6" fill="hsl(${hue} 30% 32%)"/><rect x="216" y="52" width="80" height="48" rx="6" fill="hsl(${hue} 30% 32%)"/></svg>`,
    )}`;
  const captures: Link[] = [2, 9, 20, 33].map((age, index) => ({
    id: `demo${index}`,
    url: `https://i.snap2link.app/${["4kZq8Rt2mWp7Ld9Xs3Vh1a", "9Bn2Lx7Qe4Ty6Uo1Pa8Sd3", "Hc5Vb8Nm2Kj4Gf7Dl0Qw9e", "Zr1Ty6Ui3Op8As5Df2Gh7j"][index]}`,
    preview: picture(index * 80 + 20),
    created_at: new Date(now - age * HOUR_MS).toISOString(),
    expires_at: new Date(now + (48 - age) * HOUR_MS).toISOString(),
    pinned: index === 2,
  }));
  const me: Me = {
    email: "someone@example.com",
    name: "Alex",
    language: document.documentElement.lang,
    plan: "free",
    captures_today: 7,
    daily_captures: 20,
    slots_used: captures.length,
    slots: 6,
  };
  let sessions: Session[] = [
    { id: "s1", kind: "web", created_at: new Date(now - 2 * HOUR_MS).toISOString(), current: true },
    { id: "s2", kind: "app", created_at: new Date(now - 90 * HOUR_MS).toISOString(), current: false },
    { id: "s3", kind: "app", created_at: new Date(now - 400 * HOUR_MS).toISOString(), current: false },
  ];
  const empty = location.search.includes("empty");
  let signedIn = !location.search.includes("signin");
  return {
    me: async () => (signedIn ? me : null),
    history: async () => ({ captures: empty ? [] : captures, max_pins: 5 }),
    sessions: async () => sessions,
    sendCode: async () => undefined,
    async verify(_email, code) {
      signedIn = code === "123456";
      return signedIn;
    },
    async signInWithGoogle() {
      signedIn = true;
    },
    async saveProfile(profile) {
      Object.assign(me, profile);
    },
    sendEmailCode: async () => undefined,
    async changeEmail(email, code) {
      if (code !== "123456") return false;
      me.email = email;
      return true;
    },
    async pin(id, pinned) {
      captures.find((link) => link.id === id)!.pinned = pinned;
    },
    async remove(id) {
      captures.splice(captures.findIndex((link) => link.id === id), 1);
    },
    async closeSession(id) {
      sessions = sessions.filter((session) => session.id !== id);
    },
    async closeOtherSessions() {
      sessions = sessions.filter(({ current }) => current);
    },
    exportData: async () => new Blob([JSON.stringify(me, null, 2)], { type: "application/json" }),
    async signOut() {
      signedIn = false;
    },
    deleteAccount: async () => undefined,
  };
}

const demo = import.meta.env.DEV && location.search.includes("demo");
const api = demo ? demoApi() : relayApi;

/* Turnstile stands in front of every code sent: the relay checks it was made here. */

const TURNSTILE_SITEKEY = "0x4AAAAAAF0C_X7NcOtuLv5w";
const TURNSTILE_WAIT_MS = 20_000;

interface Turnstile {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widget: string): void;
}

let widget: string | undefined;
let pendingToken: string | null = null;
let tokenWaiters: ((token: string | null) => void)[] = [];

function receiveToken(token: string | null) {
  pendingToken = token;
  for (const resolve of tokenWaiters) resolve(token);
  tokenWaiters = [];
}

function showChallenge() {
  if (demo || widget) return;
  const draw = () => {
    const turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!turnstile || widget) return;
    widget = turnstile.render($("#turnstile"), {
      sitekey: TURNSTILE_SITEKEY,
      action: "web_login",
      theme: "dark",
      language: lang,
      appearance: "interaction-only",
      callback: (token: string) => receiveToken(token),
      "expired-callback": () => receiveToken(null),
      "error-callback": () => receiveToken(null),
    });
  };
  if (document.querySelector("#turnstile-script")) return draw();
  const script = document.createElement("script");
  script.id = "turnstile-script";
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  script.async = true;
  script.addEventListener("load", draw);
  document.head.append(script);
}

/* Google, as in the app: its button gives a token made for the site's own client. */

/** The site's Google client: a Web one, with snap2link.app as its origin. Public, like the app's. */
const GOOGLE_CLIENT_ID = "";

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: Record<string, unknown>): void;
      renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

let googleShown = false;

async function googleSignIn(credential: string) {
  setMessage("#email-error", null);
  try {
    await api.signInWithGoogle(credential);
    await start();
  } catch {
    setMessage("#email-error", text.actionError);
  }
}

function showGoogle() {
  if (googleShown) return;
  if (demo) {
    googleShown = true;
    $("#google-block").hidden = false;
    $("#google-demo").hidden = false;
    $("#google-button").hidden = true;
    $("#google-demo").addEventListener("click", () => void googleSignIn("demo"));
    return;
  }
  if (!GOOGLE_CLIENT_ID) return;
  googleShown = true;
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.addEventListener("load", () => {
    const google = (window as unknown as { google?: GoogleIdentity }).google;
    if (!google) return;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }: { credential: string }) => void googleSignIn(credential),
      ux_mode: "popup",
      auto_select: false,
      itp_support: true,
    });
    google.accounts.id.renderButton($("#google-button"), {
      theme: "filled_black",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: Math.min(400, $("#form-email").clientWidth || 400),
      locale: lang,
    });
    $("#google-block").hidden = false;
  });
  document.head.append(script);
}

/** The challenge's token, waiting for it if it isn't ready. Each token works once. */
async function challengeToken(): Promise<string | null> {
  if (demo) return "demo";
  const token =
    pendingToken ??
    (await new Promise<string | null>((resolve) => {
      tokenWaiters.push(resolve);
      setTimeout(() => resolve(null), TURNSTILE_WAIT_MS);
    }));
  pendingToken = null;
  const turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
  if (widget && turnstile) turnstile.reset(widget);
  return token;
}

type Text = Record<string, string>;

const LOCALES = import.meta.glob<Text>("../account-locales/*.json", { import: "default" });

let text: Text = english;
let lang = "en";

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];

let me: Me | null = null;
let history: History = { captures: [], max_pins: 0 };
let filter: "all" | "kept" = "all";
let authEmail = "";
let newEmail = "";

/* Language */

function savedLanguage(): string | null {
  const demo = import.meta.env.DEV && new URLSearchParams(location.search).get("lang");
  if (demo) return demo;
  try {
    return localStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

function rememberLanguage(code: string) {
  try {
    localStorage.setItem(LANGUAGE_KEY, code);
  } catch {
    // Private windows can refuse storage: the language still applies to this visit.
  }
}

function browserLanguage(): string {
  for (const code of navigator.languages) {
    const match = closestLanguage(code);
    if (match) return match;
  }
  return "en";
}

async function applyLanguage(code: string) {
  text = { ...english, ...(await LOCALES[`../account-locales/${code}.json`]()) };
  lang = code;
  document.documentElement.lang = code;
  document.documentElement.dir = isRtl(code) ? "rtl" : "ltr";
  document.title = text.title;
  for (const element of $$("[data-t]")) element.textContent = text[element.dataset.t!];
  for (const element of $$("[data-t-aria]")) {
    element.setAttribute("aria-label", text[element.dataset.tAria!]);
  }
  const french = code === "fr";
  $<HTMLAnchorElement>("#legal-privacy").href = french ? "/fr/confidentialite/" : "/privacy/";
  $<HTMLAnchorElement>("#legal-terms").href = french ? "/fr/conditions/" : "/terms/";
  $<HTMLSelectElement>("#field-language").value = code;
  $("#delete-account").textContent = text.dangerButton;
  $("#email-submit").textContent = newEmail ? text.confirmEmail : text.sendCode;
  drawProfile();
  drawLinks();
  if (currentPage() === "security" && !$("#view-app").hidden) void drawSessions();
}

/* Views */

function view(name: "loading" | "auth" | "app") {
  $("#view-loading").hidden = name !== "loading";
  $("#view-auth").hidden = name !== "auth";
  $("#view-app").hidden = name !== "app";
}

function authStep(step: "email" | "code" | "error") {
  view("auth");
  if (step === "email") {
    showChallenge();
    showGoogle();
  }
  for (const name of ["email", "code", "error"]) $(`#auth-${name}`).hidden = name !== step;
}

function setMessage(selector: string, message: string | null) {
  const element = $(selector);
  element.textContent = message ?? "";
  element.hidden = message === null;
}

function flash(selector: string) {
  const element = $(selector);
  element.hidden = false;
  setTimeout(() => (element.hidden = true), SAVED_MS);
}

function actionFailed(e: unknown) {
  const limit = e instanceof ApiError && e.message === "pin_limit";
  setMessage("#action-error", limit ? text.pinLimit : text.actionError);
}

function closeMenu() {
  $("#side").removeAttribute("data-open");
  $("#menu-scrim").hidden = true;
  $("#menu-open").setAttribute("aria-expanded", "false");
}

function currentPage(): Page {
  const hash = location.hash.slice(1) as Page;
  return PAGES.includes(hash) ? hash : "overview";
}

function route(moveFocus: boolean) {
  const page = currentPage();
  for (const section of $$("[data-page]")) section.hidden = section.dataset.page !== page;
  for (const link of $$("[data-nav]")) {
    if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  setMessage("#action-error", null);
  closeMenu();
  if (page === "security") void drawSessions();
  if (moveFocus) {
    window.scrollTo(0, 0);
    $(`[data-page="${page}"] h1`).focus({ preventScroll: true });
  }
}

/* Drawing */

const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(lang, options).format(new Date(date));

function timeLeft(date: string): string {
  const hours = Math.max(1, Math.round((new Date(date).getTime() - Date.now()) / HOUR_MS));
  return new Intl.RelativeTimeFormat(lang, { numeric: "always" }).format(hours, "hour");
}

function setStat(id: string, used: number, max: number) {
  $(`#stat-${id}`).textContent = `${used} / ${max}`;
  $(`#bar-${id}`).style.width = `${max > 0 ? Math.min(100, (used / max) * 100) : 0}%`;
}

function askTwice(button: HTMLButtonElement, label: string, question: string, act: () => Promise<void>) {
  button.textContent = text[label];
  button.addEventListener("blur", () => {
    delete button.dataset.asking;
    button.textContent = text[label];
  });
  button.addEventListener("click", async () => {
    if (button.dataset.asking === undefined) {
      button.dataset.asking = "";
      button.textContent = text[question];
      return;
    }
    button.disabled = true;
    setMessage("#action-error", null);
    try {
      await act();
    } catch (e) {
      button.disabled = false;
      actionFailed(e);
    }
  });
}

function row(link: Link, atLimit: boolean): HTMLElement {
  const template = $<HTMLTemplateElement>("#link-row");
  const item = (template.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
  const date = formatDate(link.created_at, { dateStyle: "medium", timeStyle: "short" });

  const open = item.querySelector<HTMLAnchorElement>("[data-open]")!;
  open.href = link.url;
  open.setAttribute("aria-label", `${text.open}, ${date}`);
  const image = item.querySelector("img")!;
  image.src = link.preview ?? link.url;
  image.alt = text.thumbnail.replace("{date}", date);
  const address = item.querySelector<HTMLAnchorElement>("[data-url]")!;
  address.href = link.url;
  address.textContent = link.url.replace(/^https:\/\//, "");
  item.querySelector("[data-date]")!.textContent = date;
  item.querySelector("[data-left]")!.textContent = timeLeft(link.expires_at);
  if (link.pinned) item.dataset.kept = "";

  const label = (button: HTMLButtonElement, name: string) => {
    button.setAttribute("aria-label", `${name}, ${date}`);
    button.title = name;
  };

  const copy = item.querySelector<HTMLButtonElement>('[data-action="copy"]')!;
  const copied = (done: boolean) => {
    copy.querySelector<HTMLElement>('[data-icon="idle"]')!.hidden = done;
    copy.querySelector<HTMLElement>('[data-icon="done"]')!.hidden = !done;
    label(copy, done ? text.copied : text.copy);
  };
  copied(false);
  copy.addEventListener("click", async () => {
    setMessage("#action-error", null);
    try {
      await navigator.clipboard.writeText(link.url);
      copied(true);
      $("#copy-status").textContent = text.copied;
      setTimeout(() => {
        copied(false);
        $("#copy-status").textContent = "";
      }, COPIED_MS);
    } catch (e) {
      actionFailed(e);
    }
  });

  const keep = item.querySelector<HTMLButtonElement>('[data-action="keep"]')!;
  const blocked = atLimit && !link.pinned;
  label(keep, link.pinned ? text.kept : text.keep);
  if (blocked) keep.title = text.pinLimit;
  keep.setAttribute("aria-pressed", String(link.pinned));
  keep.querySelector<HTMLElement>('[data-icon="open"]')!.hidden = link.pinned;
  keep.querySelector<HTMLElement>('[data-icon="locked"]')!.hidden = !link.pinned;
  keep.disabled = blocked;
  keep.addEventListener("click", async () => {
    keep.disabled = true;
    setMessage("#action-error", null);
    try {
      await api.pin(link.id, !link.pinned);
      await refresh();
    } catch (e) {
      keep.disabled = false;
      actionFailed(e);
    }
  });

  const remove = item.querySelector<HTMLButtonElement>('[data-action="delete"]')!;
  const ask = remove.querySelector<HTMLElement>("[data-ask]")!;
  const asking = (on: boolean) => {
    if (on) remove.dataset.asking = "";
    else delete remove.dataset.asking;
    ask.hidden = !on;
    ask.textContent = on ? text.deleteConfirm : "";
    label(remove, on ? text.deleteConfirm : text.delete);
  };
  asking(false);
  remove.addEventListener("blur", () => asking(false));
  remove.addEventListener("click", async () => {
    if (remove.dataset.asking === undefined) return asking(true);
    remove.disabled = true;
    setMessage("#action-error", null);
    try {
      await api.remove(link.id);
      await refresh();
    } catch (e) {
      remove.disabled = false;
      actionFailed(e);
    }
  });
  return item;
}

function emptyRow(): HTMLElement {
  const template = $<HTMLTemplateElement>("#empty-row");
  const item = (template.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
  item.querySelector("[data-free]")!.textContent = text.slotEmpty;
  item.querySelector("[data-free-hint]")!.textContent = text.slotEmptyHint;
  return item;
}

function drawLinks() {
  const { captures, max_pins: maxPins } = history;
  const kept = captures.filter(({ pinned }) => pinned);
  const atLimit = kept.length >= maxPins;
  const shown = filter === "kept" ? kept : captures;

  const slots = me?.slots ?? captures.length;
  const free = filter === "all" ? Math.max(0, slots - captures.length) : 0;

  $("#recent").replaceChildren(...captures.slice(0, RECENT_LINKS).map((link) => row(link, atLimit)));
  $("#links").replaceChildren(
    ...shown.map((link) => row(link, atLimit)),
    ...Array.from({ length: free }, emptyRow),
  );
  $("#recent-table").hidden = captures.length === 0;
  $("#links-table").hidden = shown.length + free === 0;

  $("#slots-used").textContent = text.slotsUsed
    .replace("{used}", String(captures.length))
    .replace("{max}", String(slots));
  $("#slots-kept").textContent = text.slotsKept
    .replace("{kept}", String(kept.length))
    .replace("{max}", String(maxPins));
  $("#slot-meter").replaceChildren(
    ...Array.from({ length: slots }, (_, index) => {
      const segment = document.createElement("span");
      if (index < kept.length) segment.className = "is-kept";
      else if (index < captures.length) segment.className = "is-used";
      return segment;
    }),
  );
  for (const empty of $$("[data-empty]")) empty.hidden = captures.length > 0;
  $("#kept-empty").hidden = !(filter === "kept" && captures.length > 0 && kept.length === 0);
  for (const button of $$("[data-filter]")) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  }
  $("#nav-count").textContent = String(captures.length);
  setStat("kept", kept.length, maxPins);
  if (me) setStat("links", captures.length, me.slots);
}

function drawProfile() {
  if (!me) return;
  const display = me.name || me.email;
  const initial = display.charAt(0).toUpperCase();
  $("#user-avatar").textContent = initial;
  $("#profile-avatar").textContent = initial;
  $("#user-name").textContent = display;
  $("#user-email").textContent = me.name ? me.email : "";
  $("#user-email").hidden = !me.name;
  $("#email-current").textContent = me.email;
  $("#hello").textContent = me.name ? text.helloName.replace("{name}", me.name) : text.hello;
  $<HTMLInputElement>("#field-name").value = me.name;
  setStat("captures", me.captures_today, me.daily_captures);
}

async function drawSessions() {
  try {
    const sessions = await api.sessions();
    const template = $<HTMLTemplateElement>("#session-row");
    const rows = sessions.map((session) => {
      const row = (template.content.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement;
      row.querySelector("[data-name]")!.textContent = session.kind === "app" ? text.sessionApp : text.sessionWeb;
      row.querySelector("[data-since]")!.textContent = text.sessionSince.replace(
        "{date}",
        formatDate(session.created_at, { dateStyle: "long" }),
      );
      const current = row.querySelector<HTMLElement>("[data-current]")!;
      const close = row.querySelector<HTMLButtonElement>("[data-close]")!;
      current.hidden = !session.current;
      current.textContent = text.sessionCurrent;
      close.hidden = session.current;
      close.textContent = text.sessionClose;
      close.addEventListener("click", async () => {
        close.disabled = true;
        try {
          await api.closeSession(session.id);
          await drawSessions();
        } catch (e) {
          close.disabled = false;
          actionFailed(e);
        }
      });
      return row;
    });
    $("#sessions").replaceChildren(...rows);
    $("#sessions-close-all").hidden = sessions.length < 2;
  } catch (e) {
    actionFailed(e);
  }
}

async function refresh() {
  const [account, links] = await Promise.all([api.me(), api.history()]);
  if (!account) return start();
  me = account;
  history = links;
  drawProfile();
  drawLinks();
}

async function start() {
  view("loading");
  try {
    me = await api.me();
    await applyLanguage(closestLanguage(savedLanguage()) ?? closestLanguage(me?.language) ?? browserLanguage());
    if (!me) return authStep("email");
    await refresh();
    view("app");
    route(false);
  } catch {
    authStep("error");
  }
}

/* Sign-in */

$("#form-email").addEventListener("submit", async (event) => {
  event.preventDefault();
  authEmail = $<HTMLInputElement>("#field-email").value.trim();
  if (!authEmail.includes("@")) return setMessage("#email-error", text.emailError);
  setMessage("#email-error", null);
  try {
    const token = await challengeToken();
    if (!token) return setMessage("#email-error", text.actionError);
    await api.sendCode(authEmail, token);
    $("#code-email").textContent = authEmail;
    authStep("code");
    $("#field-code").focus();
  } catch {
    setMessage("#email-error", text.actionError);
  }
});

$("#form-code").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("#code-error", null);
  try {
    if (await api.verify(authEmail, $<HTMLInputElement>("#field-code").value.trim())) await start();
    else setMessage("#code-error", text.codeError);
  } catch {
    setMessage("#code-error", text.actionError);
  }
});

$("#code-back").addEventListener("click", () => authStep("email"));
$("#error-retry").addEventListener("click", () => void start());

/* Shell */

window.addEventListener("hashchange", () => route(true));

$("#menu-open").addEventListener("click", () => {
  $("#side").setAttribute("data-open", "");
  $("#menu-scrim").hidden = false;
  $("#menu-open").setAttribute("aria-expanded", "true");
});
$("#menu-scrim").addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

$("#sign-out").addEventListener("click", async () => {
  await api.signOut().catch(() => undefined);
  await start();
});

for (const button of $$("[data-filter]")) {
  button.addEventListener("click", () => {
    filter = button.dataset.filter as typeof filter;
    drawLinks();
  });
}

/* Profile */

$("#form-profile").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api.saveProfile({ name: $<HTMLInputElement>("#field-name").value.trim(), language: lang });
    await refresh();
    flash("#profile-saved");
  } catch (e) {
    actionFailed(e);
  }
});

function closeEmailForm() {
  newEmail = "";
  $<HTMLFormElement>("#form-new-email").reset();
  $("#form-new-email").hidden = true;
  $("#new-code-field").hidden = true;
  $("#email-edit").hidden = false;
  $("#email-submit").textContent = text.sendCode;
  setMessage("#new-email-error", null);
}

$("#email-edit").addEventListener("click", () => {
  $("#form-new-email").hidden = false;
  $("#email-edit").hidden = true;
  $("#field-new-email").focus();
});
$("#email-cancel").addEventListener("click", closeEmailForm);

$("#form-new-email").addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("#new-email-error", null);
  try {
    if (!newEmail) {
      const address = $<HTMLInputElement>("#field-new-email").value.trim();
      if (!address.includes("@")) return setMessage("#new-email-error", text.emailError);
      await api.sendEmailCode(address);
      newEmail = address;
      $("#new-code-field").hidden = false;
      $("#email-submit").textContent = text.confirmEmail;
      $("#field-new-code").focus();
      return;
    }
    if (await api.changeEmail(newEmail, $<HTMLInputElement>("#field-new-code").value.trim())) {
      closeEmailForm();
      await refresh();
      flash("#email-done");
    } else {
      setMessage("#new-email-error", text.codeError);
    }
  } catch (e) {
    const taken = e instanceof ApiError && e.message === "email_taken";
    setMessage("#new-email-error", taken ? text.emailTaken : text.actionError);
  }
});

$("#export-data").addEventListener("click", async () => {
  try {
    const url = URL.createObjectURL(await api.exportData());
    const link = document.createElement("a");
    link.href = url;
    link.download = "snap2link-account.json";
    link.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    actionFailed(e);
  }
});

/* Settings */

$("#field-language").addEventListener("change", async () => {
  const code = $<HTMLSelectElement>("#field-language").value;
  rememberLanguage(code);
  try {
    await applyLanguage(code);
    if (me) await api.saveProfile({ name: me.name, language: code });
  } catch (e) {
    actionFailed(e);
  }
});

/* Security */

$("#sessions-close-all").addEventListener("click", async () => {
  try {
    await api.closeOtherSessions();
    await drawSessions();
  } catch (e) {
    actionFailed(e);
  }
});

askTwice($<HTMLButtonElement>("#delete-account"), "dangerButton", "dangerConfirm", async () => {
  await api.deleteAccount();
  await start();
});

void start();
