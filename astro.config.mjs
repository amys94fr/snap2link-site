// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Snap2Link marketing site — static, dark, fast.
// Tailwind 4 ships through its Vite plugin; tokens live in src/styles/global.css.
export default defineConfig({
  site: "https://snap2link.app",
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: "auto",
  },
});
