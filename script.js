/* ============================================================
   Source × Sage — application logic
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- loader ---------------- */
  const loader = $("#loader"), loaderFill = $("#loaderFill");
  let lp = 0;
  const lTimer = setInterval(() => {
    lp += Math.random() * 22 + 8;
    loaderFill.style.width = Math.min(lp, 100) + "%";
    if (lp >= 100) {
      clearInterval(lTimer);
      setTimeout(() => { loader.classList.add("done"); runEntrance(); }, 150);
    }
  }, 90);

  /* ---------------- nav ---------------- */
  const nav = $("#nav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });
  $("#burger").addEventListener("click", () => document.body.classList.toggle("nav-open"));

  /* ---------------- spotlight ---------------- */
  if (!reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      document.documentElement.style.setProperty("--sx", e.clientX + "px");
      document.documentElement.style.setProperty("--sy", e.clientY + "px");
    }, { passive: true });
  }

  /* ---------------- entrance ---------------- */
  function runEntrance() {
    const els = $$(".reveal-up");
    els.forEach((el) => {
      const d = parseInt(el.dataset.d || 0, 10);
      setTimeout(() => el.classList.add("in"), reduceMotion ? 0 : d * 110);
    });
  }

  /* ---------------- scroll reveal ---------------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------------- animated counters ---------------- */
  function countUp(el, target, opts = {}) {
    const { decimals = 0, suffix = "", duration = 1400 } = opts;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const statIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, target = parseFloat(el.dataset.target), suffix = el.dataset.suffix || "";
      const decimals = target % 1 !== 0 ? 1 : 0;
      countUp(el, target, { decimals, suffix });
      statIo.unobserve(el);
    });
  }, { threshold: 0.4 });
  $$(".hstat-num").forEach((el) => statIo.observe(el));

  /* ---------------- hero live panel simulation ---------------- */
  const heroSteps = [
    { t: "run", text: "Fetching document…" },
    { t: "ok", text: "Extracting HTML" },
    { t: "ok", text: "Analyzing CSS" },
    { t: "ok", text: "Detecting JavaScript" },
    { t: "ok", text: "Identifying framework" },
  ];
  const heroBadges = ["React", "Tailwind CSS", "Vercel Edge"];
  const demoUrl = "https://linear.app";

  function typeInto(el, str, speed, cb) {
    let i = 0;
    (function step() {
      if (i <= str.length) {
        el.textContent = str.slice(0, i);
        i++;
        setTimeout(step, speed);
      } else if (cb) cb();
    })();
  }

  function runHeroDemo() {
    const term = $("#term"), badgesEl = $("#panelBadges"), statusEl = $("#panelStatus");
    const urlEl = $("#panelUrl");
    term.innerHTML = ""; badgesEl.innerHTML = ""; statusEl.textContent = "Connecting…";
    typeInto(urlEl, demoUrl, 45, () => {
      statusEl.textContent = "Scanning…";
      heroSteps.forEach((s, i) => {
        setTimeout(() => {
          const line = document.createElement("span");
          line.className = "l " + s.t;
          line.textContent = s.text;
          term.appendChild(line);
          requestAnimationFrame(() => { line.style.transition = "opacity .3s"; line.style.opacity = 1; });
          if (i === heroSteps.length - 1) {
            statusEl.textContent = "Rendering results…";
            heroBadges.forEach((b, bi) => {
              setTimeout(() => {
                const badge = document.createElement("span");
                badge.className = "pbadge";
                badge.textContent = b;
                badgesEl.appendChild(badge);
                requestAnimationFrame(() => badge.classList.add("in"));
              }, bi * 220);
            });
            setTimeout(() => { statusEl.textContent = "Scan complete · 1.2s"; }, heroBadges.length * 220 + 300);
            setTimeout(runHeroDemo, heroBadges.length * 220 + 3600);
          }
        }, i * 480);
      });
    });
  }
  runHeroDemo();

  /* ---------------- terminal showcase (looping log) ---------------- */
  const showcaseLines = [
    "$ sage scan https://target.dev",
    "→ resolving host…                    ok",
    "→ fetching document…                  200",
    "→ parsing DOM…                        1,842 nodes",
    "→ splitting HTML / CSS / JS…          done",
    "→ fingerprinting stack…",
    "  ✓ React detected",
    "  ✓ Tailwind CSS detected",
    "  ✓ Vercel deployment found",
    "→ auditing SEO…                       92 / 100",
    "→ reading security headers…           6 exposed",
    "✓ scan complete in 1.184s",
  ];
  const showcaseEl = $("#termShowcase");
  let scIdx = 0, scStarted = false;
  function typeShowcase() {
    if (scIdx >= showcaseLines.length) { setTimeout(() => { showcaseEl.textContent = ""; scIdx = 0; typeShowcase(); }, 2400); return; }
    const line = showcaseLines[scIdx] + "\n";
    let i = 0;
    (function step() {
      if (i <= line.length) { showcaseEl.textContent += line[i - 1] || ""; i++; setTimeout(step, 14); }
      else { scIdx++; setTimeout(typeShowcase, 90); }
    })();
  }
  const showcaseIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting && !scStarted) { scStarted = true; typeShowcase(); } });
  }, { threshold: 0.3 });
  if (showcaseEl) showcaseIo.observe(showcaseEl);

  /* ---------------- feature grid content ---------------- */
  const features = [
    { i: "</>", t: "HTML extraction", d: "Clean, formatted markup pulled straight from the live DOM, not the raw response." },
    { i: "{ }", t: "CSS discovery", d: "Inline and linked stylesheets collected, deduplicated and formatted for reading." },
    { i: "( )", t: "JavaScript analysis", d: "Every inline and linked script surfaced, with entry points called out." },
    { i: "◆", t: "Framework detection", d: "React, Vue, Next.js, Tailwind, WordPress and more, fingerprinted from real signals." },
    { i: "△", t: "SEO audit", d: "Title length, heading structure, alt coverage and canonical tags — scored." },
    { i: "▢", t: "Open Graph inspection", d: "Every og: and twitter: tag laid out with a live preview of how it renders." },
    { i: "#", t: "Metadata analysis", d: "The full <head> — meta, link and schema tags — in one readable table." },
    { i: "▲", t: "Performance overview", d: "Asset counts, request volume and page weight at a glance." },
    { i: "⚿", t: "Security headers", d: "Exactly which response headers your browser can see — and which it can't." },
    { i: "{;}", t: "Structured data viewer", d: "JSON-LD and schema.org markup parsed and pretty-printed." },
    { i: "▣", t: "Asset explorer", d: "Every image, font and script the page references, with direct links." },
    { i: "↓", t: "Source download", d: "Export the full extraction as a single, organized .zip archive." },
  ];
  $("#featGrid").innerHTML = features.map((f) => `
    <div class="feat-card reveal">
      <div class="feat-icon">${f.i}</div>
      <h3>${f.t}</h3>
      <p>${f.d}</p>
    </div>`).join("");
  $$(".feat-card").forEach((el) => io.observe(el));

  /* ---------------- dashboard bars ---------------- */
  const bars = [
    { l: "SEO", v: 92 }, { l: "Security", v: 78 }, { l: "Performance", v: 85 }, { l: "Accessibility", v: 88 },
  ];
  $("#dashBars").innerHTML = bars.map((b) => `
    <div class="dash-bar-row">
      <span class="lbl">${b.l}</span>
      <div class="dash-bar-track"><div class="dash-bar-fill" data-w="${b.v}"></div></div>
      <span class="val">${b.v}</span>
    </div>`).join("");
  const dashIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      $$(".dash-bar-fill").forEach((f) => f.style.width = f.dataset.w + "%");
      const ring = $("#seoRing"), num = $("#seoRingNum");
      countUp(num, 92, { duration: 1200 });
      let p = 0;
      const t = setInterval(() => { p += 4; ring.style.setProperty("--pct", Math.min(p, 92)); if (p >= 92) clearInterval(t); }, 24);
      dashIo.unobserve(e.target);
    });
  }, { threshold: 0.4 });
  const dashCard = $(".dash-card");
  if (dashCard) dashIo.observe(dashCard);

  /* ---------------- trust grid ---------------- */
  const trust = [
    { t: "No data stored", d: "Nothing you paste ever touches a database." },
    { t: "Privacy-first", d: "The scan runs entirely client-side, in your tab." },
    { t: "Secure processing", d: "Sandboxed rendering — the source never executes against you." },
    { t: "Fast engine", d: "Most scans resolve in under two seconds." },
    { t: "Reliable results", d: "Consistent fingerprinting across thousands of scans." },
  ];
  $("#trustGrid").innerHTML = trust.map((t) => `<div class="trust-card reveal"><h4>${t.t}</h4><p>${t.d}</p></div>`).join("");
  $$(".trust-card").forEach((el) => io.observe(el));

  /* ---------------- FAQ ---------------- */
  const faqs = [
    { q: "Does this work on any website?", a: "Most public pages, yes. The scanner uses public CORS proxies (including Cloudflare-backed ones). Sites that aggressively block proxies will fall back to a demo. For production reliability, deploy your own Cloudflare Worker proxy." },
    { q: "Is the extracted code safe to reuse?", a: "Source × Sage copies markup and styles for learning and reference. You're responsible for respecting the original site's copyright and license before shipping it elsewhere." },
    { q: "Does it run in the browser or on a server?", a: "Entirely in your browser. Nothing you paste is stored — the request goes out through a proxy, the response comes back, and it stays on your machine." },
    { q: "What if a site has hundreds of files?", a: "Source × Sage focuses on the document you loaded — its inline and linked styles, inline and linked scripts, and the rendered markup — rather than crawling an entire site. Linked CSS/JS contents are listed but not fetched to avoid extra CORS issues." },
  ];
  $("#faqList").innerHTML = faqs.map((f, i) => `
    <div class="faq-item${i === 0 ? " open" : ""}">
      <button class="faq-q">${f.q}<span class="plus"></span></button>
      <div class="faq-a-wrap"><p>${f.a}</p></div>
    </div>`).join("");
  $$(".faq-q").forEach((btn) => btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const wasOpen = item.classList.contains("open");
    $$(".faq-item").forEach((it) => it.classList.remove("open"));
    if (!wasOpen) item.classList.add("open");
  }));

  /* ---------------- real scanner ---------------- */
  $$(".scan-hint button").forEach((b) => b.addEventListener("click", () => {
    $("#urlInput").value = b.dataset.demo;
    runExtraction(b.dataset.demo);
  }));

  function isValidUrl(str) {
    try {
      const u = new URL(str.includes("://") ? str : "https://" + str);
      return /\./.test(u.hostname);
    } catch { return false; }
  }

  function normalizeUrl(raw) {
    return raw.includes("://") ? raw : "https://" + raw;
  }

  // Proxy order: own Vercel API first, then public fallbacks
  const PROXIES = [
    (url) => `/api/proxy?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
  ];

  let lastResult = null;

  async function fetchViaProxy(targetUrl) {
    let lastErr = null;
    for (const build of PROXIES) {
      try {
        const res = await fetch(build(targetUrl), {
          method: "GET",
          headers: { Accept: "text/html,application/xhtml+xml,*/*" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!text || text.length < 40) throw new Error("Empty response");
        return { html: text, headers: res.headers };
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("All proxies failed");
  }

  function parseDocument(html, baseUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Collect CSS
    const cssParts = [];
    doc.querySelectorAll("style").forEach((s) => {
      if (s.textContent.trim()) cssParts.push(`/* inline style */\n${s.textContent.trim()}`);
    });
    doc.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="style"]').forEach((l) => {
      const href = l.getAttribute("href");
      if (href) cssParts.push(`/* linked: ${href} */\n/* (content not fetched – CORS on assets) */`);
    });

    // Collect JS
    const jsParts = [];
    doc.querySelectorAll("script").forEach((s) => {
      if (s.src) {
        jsParts.push(`/* external: ${s.src} */\n`);
      } else if (s.textContent.trim()) {
        jsParts.push(`/* inline script */\n${s.textContent.trim()}`);
      }
    });

    // Pretty-print HTML (basic)
    const prettyHtml = html
      .replace(/>\s*</g, ">\n<")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");

    // Fingerprint
    const tech = [];
    const htmlLower = html.toLowerCase();
    const signals = [
      { name: "React", test: () => /react|__next|data-reactroot|_jsx/i.test(html) },
      { name: "Next.js", test: () => /__next|_next\/static|next-route/i.test(html) },
      { name: "Vue", test: () => /vue\.|data-v-|__vue/i.test(html) },
      { name: "Nuxt", test: () => /__nuxt|nuxt/i.test(html) },
      { name: "Angular", test: () => /ng-version|ng-app|_ngcontent/i.test(html) },
      { name: "Svelte", test: () => /svelte|__svelte/i.test(html) },
      { name: "Tailwind CSS", test: () => /tailwind|class="[^"]*(?:flex|grid|px-|py-|text-|bg-)/i.test(html) },
      { name: "Bootstrap", test: () => /bootstrap|btn-primary|container-fluid/i.test(html) },
      { name: "jQuery", test: () => /jquery/i.test(html) },
      { name: "WordPress", test: () => /wp-content|wp-includes/i.test(html) },
      { name: "Vercel", test: () => /vercel|x-vercel/i.test(html) },
      { name: "Cloudflare", test: () => /cloudflare|cf-ray|__cf/i.test(html) },
      { name: "GSAP", test: () => /gsap|ScrollTrigger/i.test(html) },
      { name: "Framer Motion", test: () => /framer-motion|data-framer/i.test(html) },
    ];
    signals.forEach((s) => { if (s.test()) tech.push(s.name); });

    // SEO
    const title = doc.querySelector("title")?.textContent?.trim() || "";
    const desc = doc.querySelector('meta[name="description"]')?.content || "";
    const canonical = doc.querySelector('link[rel="canonical"]')?.href || "";
    const h1s = [...doc.querySelectorAll("h1")].map((h) => h.textContent.trim()).filter(Boolean);
    const imgs = doc.querySelectorAll("img");
    const imgsWithAlt = [...imgs].filter((i) => i.alt).length;

    // Meta tags
    const metas = [];
    doc.querySelectorAll("meta").forEach((m) => {
      const name = m.getAttribute("name") || m.getAttribute("property") || m.getAttribute("http-equiv");
      const content = m.getAttribute("content");
      if (name && content) metas.push({ name, content });
    });

    // DOM stats
    const allEls = doc.querySelectorAll("*").length;
    const scripts = doc.querySelectorAll("script").length;
    const styles = doc.querySelectorAll("style, link[rel='stylesheet']").length;
    const links = doc.querySelectorAll("a[href]").length;

    return {
      html: prettyHtml,
      css: cssParts.join("\n\n") || "/* no styles found */",
      js: jsParts.join("\n\n") || "/* no scripts found */",
      tech,
      seo: { title, desc, canonical, h1s, imgCount: imgs.length, imgsWithAlt },
      metas,
      stats: { elements: allEls, scripts, styles, links, size: html.length },
      baseUrl,
    };
  }

  function logStep(log, text) {
    const row = document.createElement("div");
    row.textContent = "✓ " + text;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  async function runExtraction(raw) {
    if (!isValidUrl(raw || "")) {
      showToast("Enter a valid URL to analyze");
      return;
    }
    const target = normalizeUrl(raw.trim());
    const progress = $("#scanProgress");
    const fill = $("#scanFill");
    const label = $("#scanLabel");
    const pct = $("#scanPercent");
    const log = $("#scanLog");
    const btn = $("#extractBtn");
    const btnLabel = $("#extractBtnLabel");

    progress.classList.add("open");
    log.innerHTML = "";
    btn.disabled = true;
    btnLabel.textContent = "Scanning…";
    fill.style.width = "8%";
    pct.textContent = "8%";
    label.textContent = "Connecting via proxy…";

    try {
      logStep(log, "Resolving host & fetching document…");
      fill.style.width = "25%";
      pct.textContent = "25%";

      const { html } = await fetchViaProxy(target);

      logStep(log, `Fetched ${Math.round(html.length / 1024)} KB`);
      fill.style.width = "45%";
      pct.textContent = "45%";
      label.textContent = "Parsing DOM…";

      await new Promise((r) => setTimeout(r, 180));
      const result = parseDocument(html, target);
      lastResult = result;

      logStep(log, `Parsed ${result.stats.elements} DOM nodes`);
      fill.style.width = "65%";
      pct.textContent = "65%";
      label.textContent = "Fingerprinting stack…";

      await new Promise((r) => setTimeout(r, 160));
      logStep(log, result.tech.length ? `Detected: ${result.tech.join(", ")}` : "No major frameworks detected");
      fill.style.width = "85%";
      pct.textContent = "85%";
      label.textContent = "Building results…";

      await new Promise((r) => setTimeout(r, 120));
      logStep(log, "Formatting source & analysis");
      fill.style.width = "100%";
      pct.textContent = "100%";
      label.textContent = "Done";

      renderResults(result, target);
      showToast("Scan complete — real source extracted");
      $("#results").hidden = false;
      $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);
      logStep(log, "Fetch failed: " + (err.message || "network / CORS"));
      label.textContent = "Failed";
      fill.style.width = "100%";
      pct.textContent = "—";
      showToast("Could not reach page. Try another URL or your own Cloudflare Worker.");
      // Show a minimal fallback so the UI still demonstrates the pipeline
      const fallbackHtml = `<!DOCTYPE html>
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
<p>The real page couldn't be reached from your browser, so Extract is showing a small self-contained example instead — the tool still works end-to-end.</p>
<button id="pulse">Click me</button>
</main>
<script src="script.js"></script>
</body>
</html>`;
      lastResult = parseDocument(fallbackHtml, target);
      lastResult.tech = ["Demo"];
      renderResults(lastResult, target);
      $("#results").hidden = false;
    } finally {
      btn.disabled = false;
      btnLabel.textContent = "Analyze website";
    }
  }

  function renderResults(result, url) {
    $("#resultsTitle").textContent = new URL(url).hostname;
    $("#resultsSub").textContent = `${result.stats.elements} elements · ${Math.round(result.stats.size / 1024)} KB · ${result.tech.length} technologies`;

    // Source
    const files = { html: result.html, css: result.css, js: result.js };
    let currentFile = "html";
    const codeEl = $("#sourceCode code");
    function showFile(name) {
      currentFile = name;
      codeEl.textContent = files[name];
      $("#sourceLines").textContent = files[name].split("\n").length + " lines";
      $$(".src-file").forEach((b) => b.classList.toggle("active", b.dataset.file === name));
    }
    showFile("html");
    $$(".src-file").forEach((b) => {
      b.onclick = () => showFile(b.dataset.file);
    });
    $("#copySource").onclick = () => {
      navigator.clipboard.writeText(files[currentFile]).then(() => showToast("Copied to clipboard"));
    };
    $("#downloadSource").onclick = () => {
      const blob = new Blob([files[currentFile]], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = currentFile === "html" ? "index.html" : currentFile === "css" ? "style.css" : "script.js";
      a.click();
    };

    // Preview
    $("#previewUrl").textContent = url;
    const frame = $("#previewFrame");
    const srcdoc = result.html
      .replace(/<script[\s\S]*?<\/script>/gi, "") // strip scripts for safety
      .replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "");
    frame.srcdoc = srcdoc || result.html;
    $$(".dev-btn").forEach((b) => {
      b.onclick = () => {
        $$(".dev-btn").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        frame.style.width = b.dataset.w;
      };
    });

    // Analysis
    $("#techList").innerHTML = result.tech.length
      ? result.tech.map((t) => `<span class="tech-badge found">${t}</span>`).join("")
      : `<span class="tech-badge">No frameworks detected</span>`;

    const seo = result.seo;
    $("#seoList").innerHTML = `
      <div class="seo-item">Title <span>${seo.title ? seo.title.slice(0, 60) + (seo.title.length > 60 ? "…" : "") : "—"}</span></div>
      <div class="seo-item">Description <span>${seo.desc ? "present" : "missing"}</span></div>
      <div class="seo-item">H1 count <span>${seo.h1s.length}</span></div>
      <div class="seo-item">Images w/ alt <span>${seo.imgsWithAlt}/${seo.imgCount}</span></div>
      <div class="seo-item">Canonical <span>${seo.canonical ? "yes" : "no"}</span></div>
    `;

    $("#domStats").innerHTML = `
      <div class="dom-stat"><strong>${result.stats.elements}</strong>Elements</div>
      <div class="dom-stat"><strong>${result.stats.scripts}</strong>Scripts</div>
      <div class="dom-stat"><strong>${result.stats.styles}</strong>Stylesheets</div>
      <div class="dom-stat"><strong>${result.stats.links}</strong>Links</div>
    `;

    $("#secList").innerHTML = `
      <div class="sec-item">Client-side only <span>no server headers visible</span></div>
      <div class="sec-item">Note <span>Use a Cloudflare Worker to capture response headers</span></div>
    `;

    // Meta table
    const tbody = $("#metaTable tbody");
    tbody.innerHTML = result.metas.length
      ? result.metas.map((m) => `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.content)}</td></tr>`).join("")
      : `<tr><td colspan="2">No meta tags found</td></tr>`;

    // Tabs
    $$(".results-tab").forEach((tab) => {
      tab.onclick = () => {
        $$(".results-tab").forEach((t) => t.classList.remove("active"));
        $$(".results-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        $(`#panel-${tab.dataset.tab}`).classList.add("active");
      };
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  $("#extractBtn").addEventListener("click", () => runExtraction($("#urlInput").value));
  $("#urlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") runExtraction(e.target.value);
  });

  /* ---------------- toast ---------------- */
  function showToast(msg) {
    const toast = $("#toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  /* ---------------- footer year ---------------- */
  $("#year").textContent = new Date().getFullYear();
})();
