/**
 * Cloudflare Worker entry point for snap2link.app.
 *
 * Purpose: own the SEO-sensitive canonicalisations in code (versioned,
 * predictable, runs at the edge before the static-asset handler). Two
 * non-canonical traits get rewritten in a single 301:
 *
 *   1. Host on www.snap2link.app -> apex.
 *   2. Path on /index.html -> /.
 *
 * Combining them in one rule keeps http://www.snap2link.app/index.html to
 * at most two hops (CF "Always Use HTTPS" then this Worker), rather than
 * three (CF, www->apex, then /index.html->/). Google still consolidates
 * with three hops, but two is cleaner and saves a TLS handshake on
 * cold cache.
 *
 * `assets.run_worker_first` in wrangler.jsonc is what makes CF invoke
 * this script BEFORE the static-asset handler; without it, /index.html
 * matches a real file under ./dist and never reaches us.
 */

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const isWww = url.hostname === "www.snap2link.app";
    const isIndexHtml = url.pathname === "/index.html";

    if (isWww || isIndexHtml) {
      const path = isIndexHtml ? "/" : url.pathname;
      return Response.redirect(
        `https://snap2link.app${path}${url.search}`,
        301,
      );
    }

    return env.ASSETS.fetch(request);
  },
};
