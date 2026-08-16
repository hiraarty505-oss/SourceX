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
    { q: "Does this work on any website?", a: "Most public pages, yes. Some sites block cross-origin requests entirely — in that case Source × Sage shows a clear error and offers a demo scan so you can still see how it works." },
    { q: "Is the extracted code safe to reuse?", a: "Source × Sage copies markup and styles for learning and reference. You're responsible for respecting the original site's copyright and license before shipping it elsewhere." },
    { q: "Does it run in the browser or on a server?", a: "Entirely in your browser. Nothing you paste is stored — the request goes out, the response comes back, and it stays on your machine." },
    { q: "What if a site has hundreds of files?", a: "Source × Sage focuses on the document you loaded — its inline and linked styles, inline and linked scripts, and the rendered markup — rather than crawling an entire site." },
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

  /* ---------------- scanner demo buttons ---------------- */
  $$(".scan-hint button").forEach((b) => b.addEventListener("click", () => {
    $("#urlInput").value = b.dataset.demo;
    runExtraction(b.dataset.demo);
  }));

  const scanSteps = [
    "Resolving host & fetching document…",
    "Parsing DOM structure…",
    "Collecting stylesheets…",
    "Collecting scripts…",
    "Fingerprinting stack…",
    "Formatting output…",
  ];
  function isValidUrl(str) {
    try { const u = new URL(str.includes("://") ? str : "https://" + str); return /\./.test(u.hostname); }
    catch { return false; }
  }
  function runExtraction(raw) {
    if (!isValidUrl(raw || "")) { showToast("Enter a valid URL to analyze"); return; }
    const progress = $("#scanProgress"), fill = $("#scanFill"), label = $("#scanLabel"), pct = $("#scanPercent"), log = $("#scanLog");
    progress.classList.add("open");
    log.innerHTML = "";
    let step = 0;
    const per = 100 / scanSteps.length;
    const t = setInterval(() => {
      if (step >= scanSteps.length) { clearInterval(t); label.textContent = "Done"; pct.textContent = "100%"; showToast("Scan complete"); return; }
      label.textContent = scanSteps[step];
      const p = Math.round((step + 1) * per);
      pct.textContent = p + "%";
      fill.style.width = p + "%";
      const row = document.createElement("div");
      row.textContent = "✓ " + scanSteps[step];
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      step++;
    }, 420);
  }
  $("#extractBtn").addEventListener("click", () => runExtraction($("#urlInput").value));
  $("#urlInput").addEventListener("keydown", (e) => { if (e.key === "Enter") runExtraction(e.target.value); });

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
