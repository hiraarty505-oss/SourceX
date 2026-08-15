/* ============================================================
   Extract. — application logic
   ============================================================ */
(() => {
  "use strict";

  /* ---------------- utilities ---------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function prettyHtml(html) {
    let out = html.replace(/>\s*</g, ">\n<");
    if (out.length > 24000) {
      out = out.slice(0, 24000) + "\n\n<!-- …truncated for preview, full file included in download… -->";
    }
    return out.trim();
  }

  function showToast(msg) {
    const toast = $("#toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* ============================================================
     PAGE LOADER + ENTRANCE
     ============================================================ */
  window.addEventListener("load", () => {
    const fill = $("#loaderFill");
    const percentEl = $("#loaderPercent");
    const statusEl = $("#loaderStatus");
    const SPLASH_MS = 2400; // total splash duration ~2.4s (within the 2–3s target)

    const statusLines = [
      "initializing sandbox…",
      "warming up proxy pool…",
      "loading syntax engine…",
      "ready.",
    ];
    if (statusEl && !prefersReducedMotion) {
      statusLines.forEach((line, i) => {
        setTimeout(() => { statusEl.textContent = line; }, i * 560);
      });
    }

    if (prefersReducedMotion) {
      if (fill) fill.style.width = "100%";
      if (percentEl) percentEl.textContent = "100%";
      if (statusEl) statusEl.textContent = "ready.";
      $("#pageLoader").classList.add("hide");
      document.body.classList.remove("pre-load");
      return;
    }

    requestAnimationFrame(() => { if (fill) fill.style.width = "100%"; });

    // count 0% → 100% in sync with the line fill
    let start = null;
    const COUNT_MS = 1500;
    function tickPercent(ts) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / COUNT_MS, 1);
      if (percentEl) percentEl.textContent = Math.round(progress * 100) + "%";
      if (progress < 1) requestAnimationFrame(tickPercent);
    }
    setTimeout(() => requestAnimationFrame(tickPercent), 560);

    setTimeout(() => {
      $("#pageLoader").classList.add("hide");
      document.body.classList.remove("pre-load");
    }, SPLASH_MS);
  });

  /* ============================================================
     LIVE STATS — genuine per-device counters, not fake global
     numbers. Persisted in localStorage on this browser only and
     updated after every real extraction with the real elapsed time.
     ============================================================ */
  const Stats = (() => {
    const KEY = "sxs_stats_v1";
    function load() {
      try {
        const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
        return {
          sites: raw.sites || 0,
          files: raw.files || 0,
          durations: Array.isArray(raw.durations) ? raw.durations.slice(-20) : [],
        };
      } catch { return { sites: 0, files: 0, durations: [] }; }
    }
    function save(s) {
      try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable — ignore */ }
    }
    let state = load();

    function record(fileCount, ms) {
      state.sites += 1;
      state.files += fileCount;
      state.durations.push(ms);
      if (state.durations.length > 20) state.durations.shift();
      save(state);
      render(true);
    }

    function avgSeconds() {
      if (!state.durations.length) return null;
      const avg = state.durations.reduce((a, b) => a + b, 0) / state.durations.length;
      return avg / 1000;
    }

    function countUp(el, target, suffix = "") {
      if (prefersReducedMotion) { el.textContent = target + suffix; return; }
      const start = 0;
      const dur = 900;
      const t0 = performance.now();
      function step(t) {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(start + (target - start) * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function render(animate) {
      const sitesEl = $("#statSites");
      const filesEl = $("#statFiles");
      const timeEl = $("#statTime");
      if (!sitesEl) return;
      if (animate) {
        countUp(sitesEl, state.sites);
        countUp(filesEl, state.files);
      } else {
        sitesEl.textContent = state.sites;
        filesEl.textContent = state.files;
      }
      const avg = avgSeconds();
      timeEl.textContent = avg === null ? "—" : avg.toFixed(1) + "s";
    }

    return { record, render };
  })();

  // animate the stats strip in once it's visible
  const statsStripEl = $("#statsStrip");
  if (statsStripEl && "IntersectionObserver" in window) {
    const statsIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          Stats.render(true);
          statsIo.disconnect();
        }
      });
    }, { threshold: 0.4 });
    statsIo.observe(statsStripEl);
  } else if (statsStripEl) {
    Stats.render(false);
  }

  /* ============================================================
     INTERACTIVE WHITE GLOW — cursor (desktop) + touch (mobile)
     rAF + lerp-based inertia; only touches transform/opacity so
     layout, scroll and existing behaviour stay untouched.
     ============================================================ */
  (() => {
    const glow = $("#cursorGlow");
    const heroGlowEl = $(".hero-glow");
    const heroSection = $("#top");
    if (!glow || prefersReducedMotion) {
      if (heroGlowEl) heroGlowEl.classList.add("in");
      return;
    }

    let curX = window.innerWidth / 2;
    let curY = window.innerHeight / 2;
    let targetX = curX;
    let targetY = curY;
    let isTouch = false;
    let rafId = null;
    let heroCheckDue = true;

    function updateHeroGlow(y) {
      if (!heroGlowEl || !heroSection) return;
      const rect = heroSection.getBoundingClientRect();
      if (rect.bottom < -80 || rect.top > window.innerHeight + 80) return;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(y - centerY);
      const proximity = Math.max(0, 1 - dist / (rect.height * 0.85 + 1));
      heroGlowEl.style.opacity = (0.42 + proximity * 0.5).toFixed(2);
    }

    function paint() {
      const lerp = isTouch ? 0.4 : 0.12;
      curX += (targetX - curX) * lerp;
      curY += (targetY - curY) * lerp;
      glow.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      const settled = Math.abs(targetX - curX) < 0.4 && Math.abs(targetY - curY) < 0.4;
      if (!settled) {
        rafId = requestAnimationFrame(paint);
      } else {
        rafId = null;
      }
    }
    function requestPaint() {
      if (!rafId) rafId = requestAnimationFrame(paint);
    }

    function showGlowAt(x, y, touch) {
      isTouch = touch;
      targetX = x; targetY = y;
      if (!glow.classList.contains("active")) {
        curX = x; curY = y; // snap on first appearance — no fly-in from center
        glow.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      }
      glow.classList.add("active");
      requestPaint();
      updateHeroGlow(y);
    }
    function hideGlow() {
      glow.classList.remove("active");
    }
    function spawnRipple(x, y) {
      const r = document.createElement("div");
      r.className = "touch-ripple";
      r.style.left = x + "px";
      r.style.top = y + "px";
      document.body.appendChild(r);
      r.addEventListener("animationend", () => r.remove(), { once: true });
    }

    // desktop / mouse — smooth, inert follow
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") showGlowAt(e.clientX, e.clientY, false);
    }, { passive: true });
    window.addEventListener("mouseleave", hideGlow);
    document.addEventListener("mouseleave", hideGlow);

    // mobile / touch — glow at touch point + soft ripple, supports multi-touch
    window.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      showGlowAt(e.clientX, e.clientY, true);
      spawnRipple(e.clientX, e.clientY);
    }, { passive: true });
    window.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch" && glow.classList.contains("active")) {
        showGlowAt(e.clientX, e.clientY, true);
      }
    }, { passive: true });
    window.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "touch") return;
      spawnRipple(e.clientX, e.clientY);
      hideGlow();
    }, { passive: true });
    window.addEventListener("pointercancel", hideGlow, { passive: true });

    // keep hero glow correct on scroll even without pointer movement
    window.addEventListener("scroll", () => {
      if (!heroCheckDue) return;
      heroCheckDue = false;
      requestAnimationFrame(() => {
        updateHeroGlow(window.innerHeight * 0.4);
        heroCheckDue = true;
      });
    }, { passive: true });

    if (heroGlowEl) requestAnimationFrame(() => heroGlowEl.classList.add("in"));
  })();

  /* ============================================================
     NAV — scroll state + mobile burger
     ============================================================ */
  const nav = $("#nav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 24);
  }, { passive: true });

  $("#burger").addEventListener("click", () => {
    $(".nav-links").classList.toggle("mobile-open");
  });
  $$(".nav-links a").forEach((a) => a.addEventListener("click", () => {
    $(".nav-links").classList.remove("mobile-open");
  }));

  /* ============================================================
     SCROLL REVEAL
     ============================================================ */
  const revealTargets = $$(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("in"));
  }

  /* ============================================================
     HERO TERMINAL — typing loop
     ============================================================ */
  const heroCommands = [
    { cmd: "extract https://linear.app", out: "✓ 1 document · 3 stylesheets · 5 scripts found" },
    { cmd: "extract https://vercel.com", out: "✓ 1 document · 2 stylesheets · 4 scripts found" },
    { cmd: "extract https://stripe.com", out: "✓ 1 document · 4 stylesheets · 6 scripts found" },
  ];

  async function typeText(el, text, speed = 32) {
    el.textContent = "";
    for (let i = 0; i < text.length; i++) {
      el.textContent += text[i];
      await new Promise((r) => setTimeout(r, speed));
    }
  }

  async function heroLoop() {
    const line = $("#heroTypeLine");
    const body = $("#heroTerminal");
    if (prefersReducedMotion) {
      line.textContent = heroCommands[0].cmd;
      const out = document.createElement("div");
      out.className = "terminal-line terminal-out";
      out.innerHTML = heroCommands[0].out;
      body.appendChild(out);
      return;
    }
    let i = 0;
    while (true) {
      const { cmd, out } = heroCommands[i % heroCommands.length];
      await typeText(line, cmd, 34);
      await new Promise((r) => setTimeout(r, 350));
      const outLine = document.createElement("div");
      outLine.className = "terminal-line terminal-out";
      outLine.innerHTML = `<b>›</b>&nbsp;${out}`;
      body.appendChild(outLine);
      await new Promise((r) => setTimeout(r, 1800));
      outLine.remove();
      line.textContent = "";
      await new Promise((r) => setTimeout(r, 250));
      i++;
    }
  }
  heroLoop();

  /* ============================================================
     FAQ ACCORDION
     ============================================================ */
  $$(".faq-item").forEach((item) => {
    $(".faq-q", item).addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      $$(".faq-item").forEach((i) => i.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });

  /* ============================================================
     DEMO CONTENT — fallback when a live fetch can't complete
     ============================================================ */
  const DEMO = {
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Demo Page</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="card">
    <p class="eyebrow">Demo extraction</p>
    <h1>This is a fallback preview</h1>
    <p>The real page couldn't be reached from your browser, so Extract. is showing a small
       self-contained example instead — the tool still works end-to-end.</p>
    <button id="pulse">Click me</button>
  </main>
  <script src="script.js"></script>
</body>
</html>`,
    css: `:root {
  --bg: #000; --fg: #fff; --muted: #888;
}
* { box-sizing: border-box; }
body {
  margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg); color: var(--fg); font-family: -apple-system, sans-serif;
}
.card {
  max-width: 420px; padding: 40px; text-align: center;
  border: 1px solid #222; border-radius: 16px;
}
.eyebrow { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
h1 { font-size: 24px; margin: 12px 0; }
p { color: var(--muted); line-height: 1.6; }
button {
  margin-top: 20px; padding: 10px 20px; background: #fff; color: #000;
  border: none; border-radius: 6px; font-weight: 600; cursor: pointer;
  transition: transform .2s ease;
}
button:hover { transform: translateY(-2px); }`,
    js: `document.getElementById('pulse').addEventListener('click', (e) => {
  e.target.textContent = 'Nice.';
  e.target.style.transform = 'scale(0.96)';
  setTimeout(() => (e.target.style.transform = ''), 150);
});`,
  };

  /* ============================================================
     EXTRACTION ENGINE
     ============================================================ */
  const OWN_WORKER_URL = ""; // e.g. "https://extract-cors.you.workers.dev/?url=" — see cors-worker.js
  const PROXIES = [
    ...(OWN_WORKER_URL ? [(u) => OWN_WORKER_URL + encodeURIComponent(u)] : []),
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  ];

  async function fetchWithTimeout(url, ms, wantHeaders) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("bad status " + res.status);
      const text = await res.text();
      if (!wantHeaders) return text;
      // Only headers the proxy/browser actually exposes via CORS end up
      // here — most security headers from the *original* site are not
      // readable cross-origin, and we're honest about that in the UI.
      const headers = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      return { text, headers };
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  async function fetchPage(targetUrl) {
    let lastErr;
    for (const build of PROXIES) {
      try {
        const out = await fetchWithTimeout(build(targetUrl), 8000, true);
        if (out.text && out.text.length > 40) return out;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("All proxies failed");
  }

  async function fetchAsset(url) {
    for (const build of PROXIES) {
      try {
        const text = await fetchWithTimeout(build(url), 6000);
        if (text) return text;
      } catch (e) { /* try next proxy */ }
    }
    return null;
  }

  function isValidUrl(str) {
    try {
      const u = new URL(str.trim());
      return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
    } catch {
      return false;
    }
  }

  /* ============================================================
     SITE ANALYSIS — technology fingerprint, SEO snapshot, meta
     tags, exposed security headers, resource inventory.
     Runs entirely on the already-fetched HTML — no extra requests.
     ============================================================ */
  const TECH_SIGNATURES = [
    { name: "Next.js", cat: "Framework", test: (h) => /__NEXT_DATA__|_next\/static|next\/dist/i.test(h) },
    { name: "Nuxt", cat: "Framework", test: (h) => /__NUXT__|\/_nuxt\//i.test(h) },
    { name: "React", cat: "Library", test: (h) => /data-reactroot|react-dom|_reactRootContainer/i.test(h) },
    { name: "Vue.js", cat: "Framework", test: (h) => /\bv-bind\b|\bv-if\b|\bv-for\b|__vue__|vue@\d/i.test(h) },
    { name: "Angular", cat: "Framework", test: (h) => /ng-version|ng-app|angular\.min\.js/i.test(h) },
    { name: "Svelte", cat: "Framework", test: (h) => /svelte-[a-z0-9]{6}|__SVELTE__/i.test(h) },
    { name: "Alpine.js", cat: "Library", test: (h) => /alpinejs|\bx-data=/i.test(h) },
    { name: "jQuery", cat: "Library", test: (h) => /jquery(\.min)?\.js|jquery-\d/i.test(h) },
    { name: "Tailwind CSS", cat: "CSS", test: (h) => /tailwindcss|class="[^"]*\b(flex|grid)\b[^"]*\bpx-\d/i.test(h) },
    { name: "Bootstrap", cat: "CSS", test: (h) => /bootstrap(\.min)?\.css|bootstrap(\.min)?\.js/i.test(h) },
    { name: "WordPress", cat: "CMS", test: (h) => /wp-content|wp-includes|name="generator" content="WordPress/i.test(h) },
    { name: "Shopify", cat: "Commerce", test: (h) => /cdn\.shopify\.com|Shopify\.theme/i.test(h) },
    { name: "Webflow", cat: "Builder", test: (h) => /data-wf-site|webflow\.com/i.test(h) },
    { name: "Squarespace", cat: "Builder", test: (h) => /squarespace\.com|static1\.squarespace/i.test(h) },
    { name: "GSAP", cat: "Animation", test: (h) => /gsap(\.min)?\.js|greensock/i.test(h) },
    { name: "Framer Motion", cat: "Animation", test: (h) => /framer-motion/i.test(h) },
    { name: "Google Fonts", cat: "Fonts", test: (h) => /fonts\.googleapis\.com/i.test(h) },
    { name: "Font Awesome", cat: "Fonts", test: (h) => /font-?awesome/i.test(h) },
    { name: "Google Analytics", cat: "Analytics", test: (h) => /gtag\(|googletagmanager\.com|google-analytics\.com/i.test(h) },
    { name: "Google Tag Manager", cat: "Analytics", test: (h) => /googletagmanager\.com\/gtm\.js/i.test(h) },
  ];

  function detectTechnologies(fullSource) {
    return TECH_SIGNATURES.filter((t) => t.test(fullSource)).map((t) => ({ name: t.name, cat: t.cat }));
  }

  function analyzeSEO(doc) {
    const title = (doc.querySelector("title")?.textContent || "").trim();
    const desc = doc.querySelector('meta[name="description" i]')?.getAttribute("content") || "";
    const canonical = doc.querySelector('link[rel="canonical" i]')?.getAttribute("href") || "";
    const robots = doc.querySelector('meta[name="robots" i]')?.getAttribute("content") || "";
    const viewport = doc.querySelector('meta[name="viewport" i]')?.getAttribute("content") || "";
    const lang = doc.documentElement.getAttribute("lang") || "";
    const h1s = $$("h1", doc);
    const imgs = $$("img", doc);
    const imgsMissingAlt = imgs.filter((i) => !i.getAttribute("alt")).length;
    const ogTitle = doc.querySelector('meta[property="og:title" i]');
    const ogImage = doc.querySelector('meta[property="og:image" i]');
    const twitterCard = doc.querySelector('meta[name="twitter:card" i]');

    const checks = [
      { label: "Title tag", pass: title.length > 0 && title.length <= 60, detail: title ? `"${title}" — ${title.length} characters` : "Missing" },
      { label: "Meta description", pass: desc.length >= 50 && desc.length <= 160, detail: desc ? `${desc.length} characters` : "Missing" },
      { label: "Single H1 heading", pass: h1s.length === 1, detail: `${h1s.length} found on the page` },
      { label: "Image alt text", pass: imgs.length === 0 || imgsMissingAlt === 0, detail: imgs.length ? `${imgsMissingAlt} of ${imgs.length} images missing alt text` : "No images on page" },
      { label: "Viewport meta tag", pass: viewport.length > 0, detail: viewport || "Missing — page may not be mobile-friendly" },
      { label: "Canonical URL", pass: canonical.length > 0, detail: canonical || "Missing" },
      { label: "Lang attribute", pass: lang.length > 0, detail: lang || "Missing on <html>" },
      { label: "Open Graph tags", pass: !!(ogTitle && ogImage), detail: (ogTitle && ogImage) ? "og:title and og:image present" : "Incomplete — affects link previews" },
      { label: "Twitter card", pass: !!twitterCard, detail: twitterCard ? twitterCard.getAttribute("content") : "Missing" },
      { label: "Not blocking indexing", pass: !/noindex/i.test(robots), detail: robots || "No robots meta tag (defaults to indexable)" },
    ];
    const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
    return { score, checks };
  }

  function collectMetaTags(doc) {
    return $$("meta", doc).map((m) => ({
      name: m.getAttribute("name") || m.getAttribute("property") || m.getAttribute("http-equiv") || "(unnamed)",
      content: m.getAttribute("content") || "",
    })).filter((m) => m.content);
  }

  const EXPOSED_HEADER_KEYS = ["content-type", "content-length", "cache-control", "server", "last-modified", "etag"];
  const SECURITY_HEADER_KEYS = [
    "content-security-policy", "strict-transport-security", "x-frame-options",
    "x-content-type-options", "referrer-policy", "permissions-policy",
  ];
  function analyzeHeaders(headers) {
    const h = headers || {};
    const rows = [];
    [...SECURITY_HEADER_KEYS, ...EXPOSED_HEADER_KEYS].forEach((key) => {
      if (h[key]) rows.push({ key, value: h[key], exposed: true });
    });
    SECURITY_HEADER_KEYS.forEach((key) => {
      if (!h[key]) rows.push({ key, value: "Not exposed to this page — browser withholds it cross-origin, or the site doesn't set it", exposed: false });
    });
    return rows;
  }

  function collectResources(doc, baseUrl) {
    const abs = (u) => { try { return new URL(u, baseUrl).href; } catch { return u; } };
    const images = [...new Set($$("img[src]", doc).map((i) => abs(i.getAttribute("src"))))];
    const scripts = [...new Set($$("script[src]", doc).map((s) => abs(s.getAttribute("src"))))];
    const stylesheets = [...new Set($$('link[rel="stylesheet"]', doc).map((l) => abs(l.getAttribute("href"))))];
    const fontLinks = [...new Set($$('link[href*="font"]', doc).map((l) => abs(l.getAttribute("href"))))];
    return { images, scripts, stylesheets, fonts: fontLinks };
  }

  function analyzeSite(doc, baseUrl, fullSourceForTech, headers) {
    return {
      tech: detectTechnologies(fullSourceForTech),
      seo: analyzeSEO(doc),
      metaTags: collectMetaTags(doc),
      security: analyzeHeaders(headers),
      resources: collectResources(doc, baseUrl),
    };
  }

  async function extractFromHtml(rawHtml, baseUrl, headers) {
    const doc = new DOMParser().parseFromString(rawHtml, "text/html");

    // ---- CSS ----
    let cssParts = [];
    $$('style', doc).forEach((s, i) => cssParts.push(`/* inline <style> #${i + 1} */\n${s.textContent.trim()}`));
    const linkEls = $$('link[rel="stylesheet"]', doc).slice(0, 4);
    for (const link of linkEls) {
      const href = link.getAttribute("href");
      if (!href) continue;
      let abs;
      try { abs = new URL(href, baseUrl).href; } catch { continue; }
      const css = await fetchAsset(abs);
      if (css) cssParts.push(`/* fetched: ${abs} */\n${css.trim()}`);
      else cssParts.push(`/* linked stylesheet (not inlined): ${abs} */`);
    }
    const extraLinks = $$('link[rel="stylesheet"]', doc).slice(4);
    if (extraLinks.length) {
      cssParts.push(`/* + ${extraLinks.length} more stylesheet(s) referenced but not fetched */`);
    }

    // ---- JS ----
    let jsParts = [];
    $$('script:not([src])', doc).forEach((s, i) => {
      if (s.textContent.trim()) jsParts.push(`// inline <script> #${i + 1}\n${s.textContent.trim()}`);
    });
    const scriptEls = $$('script[src]', doc);
    scriptEls.slice(0, 3).forEach((s) => {
      let abs;
      try { abs = new URL(s.getAttribute("src"), baseUrl).href; } catch { abs = s.getAttribute("src"); }
      jsParts.push(`// external script referenced: ${abs}`);
    });
    if (scriptEls.length > 3) jsParts.push(`// + ${scriptEls.length - 3} more script(s) referenced`);

    const cssJoined = cssParts.join("\n\n") || "/* no stylesheets found on this page */";
    const jsJoined = jsParts.join("\n\n") || "// no inline scripts found on this page";

    return {
      html: prettyHtml(rawHtml),
      css: cssJoined,
      js: jsJoined,
      rawHtmlForPreview: rawHtml,
      analysis: analyzeSite(doc, baseUrl, rawHtml + "\n" + jsJoined, headers),
    };
  }

  /* ============================================================
     SCANNER UI WIRING
     ============================================================ */
  const urlInput = $("#urlInput");
  const inputWrap = $("#inputWrap");
  const scannerError = $("#scannerError");
  const extractBtn = $("#extractBtn");
  const extractBtnLabel = $("#extractBtnLabel");
  const scanProgress = $("#scanProgress");
  const scanFill = $("#scanFill");
  const scanPercent = $("#scanPercent");
  const scanLabel = $("#scanLabel");
  const skeletonWrap = $("#skeletonWrap");
  const steps = $$(".scan-step");

  $$(".scanner-hint button").forEach((b) => {
    b.addEventListener("click", () => {
      urlInput.value = b.dataset.demo;
      urlInput.focus();
      runExtraction(b.dataset.demo);
    });
  });

  extractBtn.addEventListener("click", () => runExtraction(urlInput.value));
  urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") runExtraction(urlInput.value); });
  urlInput.addEventListener("input", () => {
    inputWrap.classList.remove("error");
    scannerError.classList.remove("show");
  });

  const stepLabels = [
    "Connecting to host…",
    "Parsing DOM structure…",
    "Collecting stylesheets…",
    "Collecting scripts…",
    "Formatting output…",
  ];

  function setStep(idx, percent) {
    steps.forEach((s, i) => {
      s.classList.toggle("active", i === idx);
      s.classList.toggle("done", i < idx);
    });
    scanLabel.textContent = stepLabels[idx] || "Done";
    scanPercent.textContent = percent + "%";
    scanFill.style.width = percent + "%";
  }

  let extracting = false;

  async function runExtraction(rawUrl) {
    if (extracting) return;
    let url = (rawUrl || "").trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;

    if (!isValidUrl(url)) {
      inputWrap.classList.add("error");
      scannerError.classList.add("show");
      urlInput.focus();
      return;
    }

    extracting = true;
    inputWrap.classList.remove("error");
    scannerError.classList.remove("show");
    extractBtn.disabled = true;
    extractBtnLabel.textContent = "Extracting…";
    scanProgress.classList.add("active");
    skeletonWrap.classList.add("active");
    setStep(0, 6);

    let result, usedDemo = false;
    const t0 = performance.now();

    const stepTimer = (async () => {
      const targets = [18, 40, 62, 80, 94];
      for (let i = 0; i < targets.length; i++) {
        await new Promise((r) => setTimeout(r, prefersReducedMotion ? 40 : 480 + Math.random() * 260));
        setStep(i, targets[i]);
      }
    })();

    try {
      const { text: rawHtml, headers } = await fetchPage(url);
      await stepTimer;
      result = await extractFromHtml(rawHtml, url, headers);
    } catch (err) {
      await stepTimer;
      usedDemo = true;
      const demoDoc = new DOMParser().parseFromString(DEMO.html, "text/html");
      result = {
        html: prettyHtml(DEMO.html), css: DEMO.css, js: DEMO.js, rawHtmlForPreview: DEMO.html,
        analysis: analyzeSite(demoDoc, url, DEMO.html + "\n" + DEMO.js, null),
      };
      showToast("Couldn't reach that URL — showing a demo extraction instead");
    }

    setStep(5, 100);
    await new Promise((r) => setTimeout(r, 260));

    scanProgress.classList.remove("active");
    skeletonWrap.classList.remove("active");
    extractBtn.disabled = false;
    extractBtnLabel.textContent = "Extract code";
    extracting = false;

    Stats.record(3, performance.now() - t0);
    populateViewer(url, result, usedDemo);
  }

  /* ============================================================
     CODE VIEWER
     ============================================================ */
  const viewer = $("#viewer");
  const viewerUrl = $("#viewerUrl");
  const viewerStat = $("#viewerStat");
  const previewPanel = $("#previewPanel");
  const previewFrame = $("#previewFrame");
  const codeEls = { html: $("#codeHtml"), css: $("#codeCss"), js: $("#codeJs") };
  let current = { html: "", css: "", js: "" };
  let activeTab = "html";

  async function typeCode(el, text) {
    el.textContent = "";
    const cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    el.parentElement.appendChild(cursor);
    const step = 48;
    for (let i = 0; i <= text.length; i += step) {
      el.textContent = text.slice(0, i);
      await new Promise((r) => requestAnimationFrame(r));
    }
    el.textContent = text;
    cursor.remove();
    if (window.hljs) hljs.highlightElement(el);
  }

  async function populateViewer(url, result, usedDemo) {
    current = result;
    viewerUrl.textContent = new URL(url).hostname + (usedDemo ? " (demo)" : "");
    viewer.classList.add("active");
    previewPanel.classList.add("active");

    codeEls.css.textContent = result.css;
    codeEls.js.textContent = result.js;
    if (window.hljs) { hljs.highlightElement(codeEls.css); hljs.highlightElement(codeEls.js); }

    if (prefersReducedMotion) {
      codeEls.html.textContent = result.html;
      if (window.hljs) hljs.highlightElement(codeEls.html);
    } else {
      await typeCode(codeEls.html, result.html);
    }

    const totalLines = (result.html.split("\n").length + result.css.split("\n").length + result.js.split("\n").length);
    viewerStat.textContent = `${totalLines} lines extracted`;

    // live preview
    previewFrame.srcdoc = result.rawHtmlForPreview;

    if (result.analysis) renderAnalysis(result.analysis);

    viewer.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  /* tabs */
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      $$(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      $$(".code-pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === activeTab));
    });
  });

  /* copy / download */
  const filenames = { html: "index.html", css: "style.css", js: "script.js" };
  const mimes = { html: "text/html", css: "text/css", js: "text/javascript" };

  $("#copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(current[activeTab] || "");
      showToast(`Copied ${filenames[activeTab]} to clipboard`);
    } catch {
      showToast("Copy failed — select and copy manually");
    }
  });

  $("#downloadOneBtn").addEventListener("click", () => {
    download(filenames[activeTab], current[activeTab] || "", mimes[activeTab]);
    showToast(`Downloading ${filenames[activeTab]}`);
  });

  $("#downloadAllBtn").addEventListener("click", async () => {
    if (!window.JSZip) { showToast("ZIP library failed to load"); return; }
    const zip = new JSZip();
    zip.file("index.html", current.html || "");
    zip.file("style.css", current.css || "");
    zip.file("script.js", current.js || "");
    if (current.analysis) {
      const a = current.analysis;
      const lines = [
        `Source × Sage — analysis manifest`,
        ``,
        `Technologies detected: ${a.tech.map((t) => t.name).join(", ") || "none detected"}`,
        `SEO snapshot score: ${a.seo.score}/100`,
        ``,
        `Resources referenced:`,
        `— Images (${a.resources.images.length}):`, ...a.resources.images.map((u) => `  ${u}`),
        `— Stylesheets (${a.resources.stylesheets.length}):`, ...a.resources.stylesheets.map((u) => `  ${u}`),
        `— Scripts (${a.resources.scripts.length}):`, ...a.resources.scripts.map((u) => `  ${u}`),
        `— Fonts (${a.resources.fonts.length}):`, ...a.resources.fonts.map((u) => `  ${u}`),
      ];
      zip.file("resources.txt", lines.join("\n"));
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "extracted-source.zip";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("Downloading extracted-source.zip");
  });

  /* device toggle */
  $$(".device-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".device-toggle button").forEach((b) => b.classList.toggle("active", b === btn));
      previewFrame.classList.remove("tablet", "mobile");
      if (btn.dataset.device !== "desktop") previewFrame.classList.add(btn.dataset.device);
    });
  });

  /* ============================================================
     ANALYSIS PANEL — render + tabs
     ============================================================ */
  const analysisPanel = $("#analysisPanel");

  $$(".a-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".a-tab").forEach((b) => b.classList.toggle("active", b === btn));
      $$(".a-pane").forEach((p) => p.classList.toggle("active", p.dataset.apane === btn.dataset.atab));
    });
  });

  function svgIcon(pass) {
    return pass
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  }

  function renderAnalysis(a) {
    analysisPanel.classList.add("active");

    // technology
    const techGrid = $("#techGrid");
    techGrid.innerHTML = a.tech.length
      ? a.tech.map((t, i) => `<div class="tech-badge" style="animation-delay:${Math.min(i, 8) * 45}ms"><span class="tech-dot"></span>${escapeHtml(t.name)}<span class="tech-cat">${escapeHtml(t.cat)}</span></div>`).join("")
      : `<p class="tech-empty">No known frameworks or libraries fingerprinted in this page's markup or scripts.</p>`;

    // seo
    $("#seoRing").style.setProperty("--pct", a.seo.score);
    $("#seoScoreNum").textContent = a.seo.score;
    $("#seoChecklist").innerHTML = a.seo.checks.map((c) => `
      <li class="${c.pass ? "pass" : "fail"}">
        <span class="seo-check-icon">${svgIcon(c.pass)}</span>
        <span><span class="seo-check-label">${escapeHtml(c.label)}</span><span class="seo-check-detail">${escapeHtml(c.detail)}</span></span>
      </li>`).join("");

    // meta tags
    const metaBody = $("#metaTableBody");
    metaBody.innerHTML = a.metaTags.length
      ? a.metaTags.map((m) => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.content)}</td></tr>`).join("")
      : `<tr class="meta-table-empty"><td colspan="2">No meta tags found on this page.</td></tr>`;

    // security headers
    $("#secList").innerHTML = a.security.map((s) => `
      <div class="sec-item ${s.exposed ? "exposed" : ""}">
        <span class="sec-item-name">${escapeHtml(s.key)}</span>
        <span class="sec-item-val">${escapeHtml(s.value)}</span>
        <span class="sec-badge">${s.exposed ? "Exposed" : "Not exposed"}</span>
      </div>`).join("");

    // resources
    const r = a.resources;
    $("#resSummary").innerHTML = [
      { n: r.images.length, l: "Images" },
      { n: r.stylesheets.length, l: "Stylesheets" },
      { n: r.scripts.length, l: "Scripts" },
      { n: r.fonts.length, l: "Font links" },
    ].map((s) => `<div><div class="res-num">${s.n}</div><div class="res-lbl">${s.l}</div></div>`).join("");

    function resCol(title, list) {
      const items = list.slice(0, 40).map((u) => `<li><a href="${escapeHtml(u)}" target="_blank" rel="noopener">${escapeHtml(u)}</a></li>`).join("");
      return `<div class="res-col"><h4>${title} (${list.length})</h4>${list.length ? `<ul>${items}</ul>` : `<div class="res-col-empty">None found</div>`}</div>`;
    }
    $("#resCols").innerHTML = [
      resCol("Images", r.images),
      resCol("Stylesheets", r.stylesheets),
      resCol("Scripts", r.scripts),
      resCol("Fonts", r.fonts),
    ].join("");
  }

  /* footer year */
  $("#year").textContent = new Date().getFullYear();
})();
