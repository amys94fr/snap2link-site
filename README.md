# snap2link.app — marketing site

Static landing page for [Snap2Link](https://github.com/amys94fr/Snap2Link)
(the desktop screenshot-to-Drive-link app). Lives at <https://snap2link.app>.

## Stack

- **Astro 6** — static site, zero JS by default, partial hydration only where needed.
- **Tailwind 4** via the Vite plugin. Tokens declared in `src/styles/global.css` under `@theme`.
- **Geist Sans + Geist Mono** self-hosted via Fontsource — no Google Fonts call.
- Per-section components in `src/components/`, composed in `src/pages/index.astro`.

Design system is the source of truth for colours, type, spacing — see
[`docs/DESIGN_SYSTEM.md`](https://github.com/amys94fr/Snap2Link/blob/main/docs/DESIGN_SYSTEM.md)
in the main app repo.

## Local dev

```bash
pnpm install
pnpm dev         # http://localhost:4321
pnpm build       # static site to ./dist
pnpm preview     # serve the built site
```

## Deploy

Cloudflare Workers (Static Assets) — connected to the `main` branch of
this repo, builds on push. The `packageManager` field in `package.json`
+ the `pnpm-lock.yaml` make Cloudflare auto-detect pnpm via corepack.
Output `dist/`.

DNS is on Cloudflare too, so the apex `snap2link.app` and `www.` both
proxy to the Pages project.

## Structure

```
src/
  layouts/
    Layout.astro          # base HTML, head, OG meta, font preload
  components/
    Nav.astro             # sticky nav with GitHub star button
    Hero.astro            # headline + 3 install CTAs + DemoFrame
    DemoFrame.astro       # 5-phase animated capture sequence (vanilla JS)
    Why.astro             # AI-workflow framing + tool chips
    Features.astro        # 9-card bento grid
    AnnotatorCard.astro   # wide bento card with mock annotator UI
    HowItWorks.astro      # 3-step horizontal timeline
    Install.astro         # tabbed Win / macOS / Linux + copy buttons
    OpenSource.astro      # stars / contributors stats + GitHub cards
    Footer.astro          # links + socials
  pages/
    index.astro           # root composition
  styles/
    global.css            # Tailwind 4 + design tokens + section styles
public/
  assets/                 # logo + favicons
```

## Adding content

- Update version + tagline copy in `Hero.astro`
- Update install commands in `Install.astro`'s `PLATFORMS` array
- Star count is hard-coded in `pages/index.astro`; bump on deploy
- Footer year is computed from `new Date()` so no maintenance needed
