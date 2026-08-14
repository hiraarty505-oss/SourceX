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
    const SPLASH_MS = 2400; // total splash duration ~2.4s (within the 2–3s target)

    if (prefersReducedMotion) {
      if (fill) fill.style.width = "100%";
      if (percentEl) percentEl.textContent = "100%";
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
  const PROXIES = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  ];

  async function fetchWithTimeout(url, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error("bad status " + res.status);
      return await res.text();
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  async function fetchPage(targetUrl) {
    let lastErr;
    for (const build of PROXIES) {
      try {
        const text = await fetchWithTimeout(build(targetUrl), 8000);
        if (text && text.length > 40) return text;
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

  async function extractFromHtml(rawHtml, baseUrl) {
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

    return {
      html: prettyHtml(rawHtml),
      css: cssParts.join("\n\n") || "/* no stylesheets found on this page */",
      js: jsParts.join("\n\n") || "// no inline scripts found on this page",
      rawHtmlForPreview: rawHtml,
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

    const stepTimer = (async () => {
      const targets = [18, 40, 62, 80, 94];
      for (let i = 0; i < targets.length; i++) {
        await new Promise((r) => setTimeout(r, prefersReducedMotion ? 40 : 480 + Math.random() * 260));
        setStep(i, targets[i]);
      }
    })();

    try {
      const rawHtml = await fetchPage(url);
      await stepTimer;
      result = await extractFromHtml(rawHtml, url);
    } catch (err) {
      await stepTimer;
      usedDemo = true;
      result = { html: prettyHtml(DEMO.html), css: DEMO.css, js: DEMO.js, rawHtmlForPreview: DEMO.html };
      showToast("Couldn't reach that URL — showing a demo extraction instead");
    }

    setStep(5, 100);
    await new Promise((r) => setTimeout(r, 260));

    scanProgress.classList.remove("active");
    skeletonWrap.classList.remove("active");
    extractBtn.disabled = false;
    extractBtnLabel.textContent = "Extract code";
    extracting = false;

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
      await typeCode
