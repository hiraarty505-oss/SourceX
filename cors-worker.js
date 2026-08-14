/**
 * cors-worker.js
 * -----------------------------------------------------------------
 * Your own CORS relay for Extract. — deploy this on Cloudflare Workers
 * (free tier: 100,000 requests/day, no credit card needed) so extraction
 * doesn't depend on unreliable public CORS proxies.
 *
 * WHAT IT DOES
 *   GET https://<your-worker>.workers.dev/?url=https://example.com
 *   -> fetches https://example.com server-side and returns the body
 *      with permissive CORS headers, so your browser can read it.
 *
 * DEPLOY (takes ~2 minutes, no local setup needed)
 *   1. Go to https://dash.cloudflare.com/ → sign up / log in (free).
 *   2. Workers & Pages → Create → "Create Worker".
 *   3. Give it a name, e.g. "extract-cors" → Deploy (this creates a
 *      placeholder worker first, that's fine).
 *   4. Click "Edit code", delete everything in the editor, paste this
 *      entire file, then click "Deploy" again.
 *   5. Copy your worker's URL, it looks like:
 *      https://extract-cors.<your-subdomain>.workers.dev
 *   6. Open script.js in the Extract. project, find this line near the
 *      top of the "EXTRACTION ENGINE" section:
 *
 *          const OWN_WORKER_URL = "";
 *
 *      and set it to your worker URL + "/?url=", e.g.:
 *
 *          const OWN_WORKER_URL = "https://extract-cors.you.workers.dev/?url=";
 *
 *   7. Save, redeploy/refresh the site. Your worker is now tried FIRST,
 *      before any public proxy, for every extraction.
 *
 * NOTES
 *   - This is a generic relay: it will fetch whatever URL it's given.
 *     Consider adding your own allowlist/rate-limiting if you deploy
 *     this publicly and share the link (see OPTIONAL HARDENING below).
 *   - Free tier is per-Cloudflare-account, so it's yours alone — no
 *     sharing rate limits with other users of a public proxy.
 * -----------------------------------------------------------------
 */

export default {
  async fetch(request) {
    const inbound = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const target = inbound.searchParams.get("url");
    if (!target) {
      return json({ error: "Missing ?url= parameter" }, 400);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
      if (!["http:", "https:"].includes(targetUrl.protocol)) throw new Error("bad protocol");
    } catch {
      return json({ error: "Invalid URL" }, 400);
    }

    // ---- OPTIONAL HARDENING ----------------------------------------
    // Uncomment to restrict this relay to specific hosts only:
    // const allowed = ["example.com", "yourdomain.com"];
    // if (!allowed.some((h) => targetUrl.hostname === h || targetUrl.hostname.endsWith("." + h))) {
    //   return json({ error: "Host not allowed" }, 403);
    // }
    // ------------------------------------------------------------------

    try {
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ExtractBot/1.0; +https://github.com/)",
          "Accept": "text/html,application/xhtml+xml,*/*",
        },
        redirect: "follow",
        cf: { cacheTtl: 60, cacheEverything: false },
      });

      const body = await upstream.text();
      const headers = corsHeaders();
      headers.set("Content-Type", upstream.headers.get("Content-Type") || "text/plain; charset=utf-8");
      headers.set("X-Extract-Status", String(upstream.status));

      return new Response(body, { status: 200, headers });
    } catch (e) {
      return json({ error: "Upstream fetch failed", detail: String(e) }, 502);
    }
  },
};

function corsHeaders() {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Cache-Control": "no-store",
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: (() => { const h = corsHeaders(); h.set("Content-Type", "application/json"); return h; })(),
  });
}
