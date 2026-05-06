// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// Snap2Link marketing site — static, dark, fast.
// Tailwind 4 ships through its Vite plugin; tokens live in src/styles/global.css.
export default defineConfig({
  site: "https://snap2link.app",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: "auto",
  },
  server: {
    // Port 4321 is taken by another local agent — use 4322 instead.
    port: 4322,
    host: true,
  },
});
