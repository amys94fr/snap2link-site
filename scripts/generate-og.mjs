// Generate the 1200x630 Open Graph image at public/og.png
//
// Usage: node scripts/generate-og.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const FONTS = await Promise.all([
  readFile(`${ROOT}/node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff`),
  readFile(`${ROOT}/node_modules/@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff`),
  readFile(`${ROOT}/node_modules/@fontsource/geist-sans/files/geist-sans-latin-700-normal.woff`),
  readFile(`${ROOT}/node_modules/@fontsource/geist-mono/files/geist-mono-latin-400-normal.woff`),
]);

const fonts = [
  { name: "Geist", data: FONTS[0], weight: 400, style: "normal" },
  { name: "Geist", data: FONTS[1], weight: 600, style: "normal" },
  { name: "Geist", data: FONTS[2], weight: 700, style: "normal" },
  { name: "Geist Mono", data: FONTS[3], weight: 400, style: "normal" },
];

// Tokens
const slate950 = "#0F172A";
const slate100 = "#F1F5F9";
const slate300 = "#CBD5E1";
const slate400 = "#94A3B8";
const slate800 = "#334155";
const slate900 = "#1E293B";
const brand = "#D97757";

/**
 * `e()` builds a satori-compatible element. Critically, every <div> with
 * more than one child gets `display: flex` injected — satori errors out
 * otherwise.
 */
const FLEX = { display: "flex" };
const e = (type, style = {}, ...children) => ({
  type,
  props: {
    style: { ...FLEX, ...style },
    children: children.flat().filter((c) => c != null),
  },
});

const root = e(
  "div",
  {
    width: "1200px",
    height: "630px",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "60px",
    fontFamily: "Geist",
    backgroundColor: slate950,
    backgroundImage: `radial-gradient(circle at 20% 25%, rgba(217,119,87,0.45) 0%, rgba(217,119,87,0) 55%)`,
    color: slate100,
  },
  // ── Top row: brand mark + wordmark ──────────────────────────────
  e(
    "div",
    { alignItems: "center", gap: "16px" },
    e(
      "div",
      {
        width: "44px",
        height: "44px",
        borderRadius: "10px",
        backgroundColor: brand,
        alignItems: "center",
        justifyContent: "center",
        fontSize: "26px",
        fontWeight: 700,
        color: "white",
      },
      "S",
    ),
    e(
      "div",
      {
        fontSize: "22px",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: slate100,
      },
      "snap2link.app",
    ),
  ),
  // ── Center: wordmark + tagline + install pill ────────────────────
  e(
    "div",
    { flexDirection: "column", gap: "20px" },
    e(
      "div",
      {
        alignItems: "baseline",
        fontSize: "104px",
        fontWeight: 700,
        letterSpacing: "-0.045em",
        color: slate100,
      },
      e("span", { display: "flex", color: slate100 }, "Snap"),
      e("span", { display: "flex", color: brand }, "2"),
      e("span", { display: "flex", color: slate100 }, "Link"),
    ),
    e(
      "div",
      {
        fontSize: "30px",
        fontWeight: 400,
        color: slate300,
        letterSpacing: "-0.01em",
        maxWidth: "1000px",
      },
      "Paste screenshots into Claude Code, Cursor, or any terminal AI. One keystroke.",
    ),
    e(
      "div",
      { alignItems: "center", gap: "12px", marginTop: "8px" },
      e(
        "div",
        {
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          borderRadius: "8px",
          backgroundColor: slate900,
          border: `1px solid ${slate800}`,
          fontFamily: "Geist Mono",
          fontSize: "20px",
          color: slate100,
        },
        e("span", { display: "flex", color: slate400 }, "$"),
        e("span", { display: "flex", color: slate100 }, "winget install snap2link"),
      ),
      e(
        "div",
        {
          padding: "10px 18px",
          borderRadius: "9999px",
          border: `1px solid ${slate800}`,
          backgroundColor: slate900,
          fontSize: "16px",
          color: slate300,
        },
        "v1.3.0",
      ),
    ),
  ),
  // ── Bottom row: platform pills + GitHub ──────────────────────────
  e(
    "div",
    { justifyContent: "space-between", alignItems: "center" },
    e(
      "div",
      { gap: "12px" },
      ...["Windows", "macOS", "Linux"].map((p) =>
        e(
          "div",
          {
            padding: "8px 18px",
            borderRadius: "9999px",
            border: `1px solid ${slate800}`,
            backgroundColor: slate900,
            color: slate300,
            fontSize: "18px",
            fontWeight: 500,
          },
          p,
        ),
      ),
    ),
    e(
      "div",
      {
        color: brand,
        fontFamily: "Geist Mono",
        fontSize: "20px",
        fontWeight: 400,
      },
      "github.com/amys94fr/Snap2Link",
    ),
  ),
);

const svg = await satori(root, { width: 1200, height: 630, fonts });
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  background: slate950,
})
  .render()
  .asPng();

const outDir = `${ROOT}/public`;
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/og.png`, png);

console.log(`✓ Wrote ${outDir}/og.png (${(png.byteLength / 1024).toFixed(1)} KB)`);
