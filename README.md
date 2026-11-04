# snap2link.app - marketing site

Static landing page for [Snap2Link](https://github.com/amys94fr/Snap2Link)
(the desktop screenshot-to-Drive-link app). Lives at <https://snap2link.app>.

## Stack

- **Astro 6** — static site, zero JS by default, partial hydration only where needed.
- **Tailwind 4** via the Vite plugin. Tokens declared in `src/styles/global.css` under `@theme`.
- **Geist Sans + Geist Mono** self-hosted via Fontsource - no Google Fonts call.
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

Cloudflare Workers (Static Assets), deployed by GitHub Actions on each push to
`main` (`.github/workflows/deploy.yml`). `pnpm check` and `pnpm build` run first,
on pull requests too. Output `dist/`.

The workflow needs the `CLOUDFLARE_API_TOKEN` secret, made in the Cloudflare
dashboard from the "Edit Cloudflare Workers" template.

TypeScript stays on 6.x: `astro check` can't use TypeScript 7 yet.

DNS is on Cloudflare too, and the apex `snap2link.app` and `www.` are Custom
Domains of the Worker.

There is no Worker script: requests to static assets are free and unlimited.
The two redirects (`www` to the apex, `/index.html` to `/`) are Redirect Rules
on the zone, in the Cloudflare dashboard. HTML headers are in `public/_headers`.

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
