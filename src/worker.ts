/**
 * Cloudflare Worker entry point for snap2link.app.
 *
 * Three responsibilities:
 *
 *   1. SEO canonicalisations: www -> apex and /index.html -> /.
 *      Both collapsed into a single 301 (saves a hop on the worst
 *      case http://www.snap2link.app/index.html).
 *
 *   2. Header hygiene on the asset response: ensure HTML carries
 *      charset=utf-8 in Content-Type (the static-asset handler
 *      doesn't include it by default, and strict JSON-LD parsers
 *      use the HTTP header rather than the <meta charset>).
 *
 *   3. Sensible Cache-Control: HTML gets 5 min browser cache +
 *      1 day edge cache. Hashed assets keep their long cache.
 *      The previous default (max-age=0, must-revalidate) forced
 *      a revalidation round-trip on every pageview.
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

    const response = await env.ASSETS.fetch(request);
    const contentType = response.headers.get("Content-Type") ?? "";

    // Skip rewriting redirects, errors, opaque types.
    if (response.status !== 200 || !contentType) return response;

    const headers = new Headers(response.headers);

    if (contentType.startsWith("text/html")) {
      if (!contentType.toLowerCase().includes("charset")) {
        headers.set("Content-Type", "text/html; charset=utf-8");
      }
      headers.set("Cache-Control", "public, max-age=300, s-maxage=86400");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
