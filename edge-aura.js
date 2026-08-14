/* ============================================================
   edge-aura — organic glow that hugs the edge of the screen
   Self-contained Canvas 2D effect, no dependencies.
   Themed to match the site's monochrome black/white palette.
   ============================================================ */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.id = "edgeAuraCanvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9999",
    mixBlendMode: "screen",
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  // ---- config ----
  const CONFIG = {
    band: 90,            // thickness of the glow band, px
    inset: 6,             // gap from the true edge
    cornerRadius: 46,     // rounded-rect corner radius
    coreColor: [255, 255, 255],   // bright core line — white
    glowColor: [200, 200, 210],   // soft bloom — light gray/white
    baseAlpha: 0.85,
    waveSpeed: 0.00035,
    waveAmp: 10,          // px of organic undulation
    breathSpeed: 0.0006,
  };

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // Simple deterministic pseudo-noise (sum of sines) — no deps needed
  function noise(t, seed) {
    return (
      Math.sin(t * 1.0 + seed) * 0.5 +
      Math.sin(t * 1.7 + seed * 2.1) * 0.3 +
      Math.sin(t * 2.6 + seed * 0.6) * 0.2
    );
  }

  function roundedRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function rgba([r, g, b], a) {
    return `rgba(${r},${g},${b},${a})`;
  }

  let start = performance.now();
  let raf = null;

  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, W, H);

    const breath = 0.75 + 0.25 * Math.sin(t * CONFIG.breathSpeed);
    const inset = CONFIG.inset + noise(t * CONFIG.waveSpeed, 3.3) * (CONFIG.waveAmp * 0.4);

    // outer soft bloom
    ctx.save();
    roundedRectPath(inset, inset, W - inset * 2, H - inset * 2, CONFIG.cornerRadius);
    ctx.clip();

    const layers = 4;
    for (let i = layers; i >= 1; i--) {
      const spread = (CONFIG.band / layers) * i;
      const wobble = noise(t * CONFIG.waveSpeed * (1 + i * 0.15), i * 1.9) * CONFIG.waveAmp;
      const alpha = (CONFIG.baseAlpha / layers) * breath * (1 - i / (layers + 1.4));

      roundedRectPath(
        inset - wobble * 0.15,
        inset - wobble * 0.15,
        W - inset * 2 + wobble * 0.3,
        H - inset * 2 + wobble * 0.3,
        CONFIG.cornerRadius + spread * 0.2
      );
      ctx.lineWidth = spread;
      ctx.strokeStyle = rgba(CONFIG.glowColor, alpha);
      ctx.filter = `blur(${6 + i * 5}px)`;
      ctx.stroke();
    }
    ctx.filter = "none";
    ctx.restore();

    // bright thin core line
    ctx.save();
    const coreWobble = noise(t * CONFIG.waveSpeed * 1.3, 7.7) * (CONFIG.waveAmp * 0.5);
    roundedRectPath(
      inset + 1 - coreWobble * 0.1,
      inset + 1 - coreWobble * 0.1,
      W - (inset + 1) * 2 + coreWobble * 0.2,
      H - (inset + 1) * 2 + coreWobble * 0.2,
      CONFIG.cornerRadius
    );
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba(CONFIG.coreColor, 0.55 * breath);
    ctx.filter = "blur(0.6px)";
    ctx.stroke();
    ctx.filter = "none";
    ctx.restore();

    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (raf) return;
    start = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else if (!prefersReducedMotion) play();
  });

  if (prefersReducedMotion) {
    // draw a single static soft frame instead of animating
    frame(performance.now());
  } else {
    play();
  }

  // expose for debugging / tuning, mirrors the pattern from edge-aura.js.org
  window.__edgeAura = { CONFIG, play, pause };
})();
