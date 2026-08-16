// Vercel Serverless Function — CORS proxy for Source × Sage
// Deploy together with the rest of the site on Vercel.

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Expose-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const target = req.query.url;
  if (!target || typeof target !== "string") {
    return res.status(400).send("Missing ?url= parameter");
  }

  // Basic safety: only allow http/https
  if (!/^https?:\/\//i.test(target)) {
    return res.status(400).send("Invalid URL");
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SourceSage/1.0; +https://github.com)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    const body = await upstream.arrayBuffer();
    const contentType =
      upstream.headers.get("content-type") || "text/html; charset=utf-8";

    res.setHeader("Content-Type", contentType);
    // Forward a few useful headers for the analysis panel
    ["server", "x-powered-by", "x-vercel-id", "cf-ray"].forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) res.setHeader("x-upstream-" + h, v);
    });

    return res.status(upstream.status).send(Buffer.from(body));
  } catch (err) {
    return res.status(502).send("Proxy error: " + (err.message || "unknown"));
  }
}
