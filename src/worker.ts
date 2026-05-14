/**
 * Cloudflare Worker entry point for snap2link.app.
 *
 * Purpose: own the SEO-sensitive redirects in code (versioned, predictable,
 * runs at the edge before the static-asset handler) instead of relying on
 * dashboard Page Rules.
 *
 * Three rules, in this order:
 *   1. apex enforcement: anything on www.snap2link.app, including http://,
 *      301 -> https://snap2link.app + same path + same query.
 *   2. index.html canonicalisation: /index.html 301 -> / (CF's default
 *      static-asset handler does a 307 here, which Google treats as a
 *      separate URL and reports under "Duplicate, Google chose different
 *      canonical").
 *   3. everything else: hand off to env.ASSETS, the Static Assets binding
 *      pointed at the Astro build output (./dist).
 */

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. www -> apex, always over HTTPS, 301 permanent.
    //    The bad legacy Page Rule emitted "https://snap2link.app${request.uri}/"
    //    literally; this replaces it cleanly.
    if (url.hostname === "www.snap2link.app") {
      const target = new URL(url.pathname + url.search, "https://snap2link.app");
      return Response.redirect(target.toString(), 301);
    }

    // 2. /index.html -> / (and preserve any query string).
    //    Without this, CF Workers Static Assets emits a 307 which leaves
    //    Google believing /index.html is a separate, lower-quality URL.
    if (url.pathname === "/index.html") {
      const target = new URL("/" + url.search, url.origin);
      return Response.redirect(target.toString(), 301);
    }

    // 3. Default: serve the static asset (or the 404 page when missing).
    return env.ASSETS.fetch(request);
  },
};
