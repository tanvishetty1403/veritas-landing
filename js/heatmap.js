/**
 * Forensic heatmap — smooth per-pixel field with blue / amber / red scale.
 * value: -1 = original (blue), 0 = hybrid (amber), +1 = AI (red)
 */

const HEATMAP_ZONES = [
  { x: 0.50, y: 0.42, r: 0.28, v: -0.85 },
  { x: 0.38, y: 0.38, r: 0.18, v: -0.75 },
  { x: 0.62, y: 0.50, r: 0.16, v: -0.60 },
  { x: 0.22, y: 0.72, r: 0.20, v: 0.15 },
  { x: 0.78, y: 0.68, r: 0.18, v: 0.25 },
  { x: 0.55, y: 0.22, r: 0.12, v: 0.92 },
  { x: 0.72, y: 0.30, r: 0.10, v: 0.78 },
  { x: 0.48, y: 0.58, r: 0.14, v: 0.05 },
  { x: 0.12, y: 0.35, r: 0.14, v: -0.40 },
  { x: 0.88, y: 0.45, r: 0.12, v: 0.35 },
];

const COLOR_STOPS = [
  { t: -1.0, r: 30,  g: 100, b: 220 },
  { t: -0.2, r: 56,  g: 140, b: 210 },
  { t:  0.0, r: 230, g: 160, b: 40  },
  { t:  0.4, r: 220, g: 90,  b: 50  },
  { t:  1.0, r: 200, g: 45,  b: 45  },
];

function sampleField(nx, ny, zones) {
  let sum = 0;
  let weight = 0;
  for (const z of zones) {
    const dx = nx - z.x;
    const dy = ny - z.y;
    const d2 = dx * dx + dy * dy;
    const w = Math.exp(-d2 / (2 * z.r * z.r));
    sum += w * z.v;
    weight += w;
  }
  return weight > 0 ? sum / weight : -1;
}

function valueToRgb(v) {
  v = Math.max(-1, Math.min(1, v));
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const a = COLOR_STOPS[i];
    const b = COLOR_STOPS[i + 1];
    if (v >= a.t && v <= b.t) {
      const f = (v - a.t) / (b.t - a.t);
      return {
        r: Math.round(a.r + (b.r - a.r) * f),
        g: Math.round(a.g + (b.g - a.g) * f),
        b: Math.round(a.b + (b.b - a.b) * f),
      };
    }
  }
  const last = COLOR_STOPS[COLOR_STOPS.length - 1];
  return { r: last.r, g: last.g, b: last.b };
}

function buildHeatmapImageData(w, h, zones, progress) {
  const gridW = 80;
  const gridH = Math.round(gridW * (h / w));
  const field = new Float32Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const nx = gx / (gridW - 1);
      const ny = gy / (gridH - 1);
      field[gy * gridW + gx] = sampleField(nx, ny, zones);
    }
  }

  const imageData = new ImageData(w, h);
  const data = imageData.data;

  for (let py = 0; py < h; py++) {
    const gy = (py / (h - 1)) * (gridH - 1);
    const gy0 = Math.floor(gy);
    const gy1 = Math.min(gy0 + 1, gridH - 1);
    const fy = gy - gy0;

    for (let px = 0; px < w; px++) {
      const gx = (px / (w - 1)) * (gridW - 1);
      const gx0 = Math.floor(gx);
      const gx1 = Math.min(gx0 + 1, gridW - 1);
      const fx = gx - gx0;

      const v00 = field[gy0 * gridW + gx0];
      const v10 = field[gy0 * gridW + gx1];
      const v01 = field[gy1 * gridW + gx0];
      const v11 = field[gy1 * gridW + gx1];

      const v = (1 - fx) * (1 - fy) * v00 +
                fx * (1 - fy) * v10 +
                (1 - fx) * fy * v01 +
                fx * fy * v11;

      const masked = v * progress;
      const intensity = Math.abs(masked);
      const alpha = Math.round(Math.min(200, 40 + intensity * 160));

      const rgb = valueToRgb(masked);
      const i = (py * w + px) * 4;
      data[i]     = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = alpha;
    }
  }

  return imageData;
}

function drawHeatmap(canvas, progress, animate) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");

  if (!animate) {
    ctx.clearRect(0, 0, w, h);
    const imgData = buildHeatmapImageData(w, h, HEATMAP_ZONES, progress);
    ctx.putImageData(imgData, 0, 0);
    return;
  }

  let frame = 0;
  const total = 50;

  function step() {
    const t = Math.min(frame / total, 1);
    const eased = 1 - Math.pow(1 - t, 2.5);
    ctx.clearRect(0, 0, w, h);
    ctx.putImageData(buildHeatmapImageData(w, h, HEATMAP_ZONES, eased * progress), 0, 0);
    frame++;
    if (frame <= total) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function setupCanvas(canvas, img) {
  const w = img.naturalWidth || img.clientWidth;
  const h = img.naturalHeight || img.clientHeight;
  canvas.width = w;
  canvas.height = h;
}

function initHeatmap(canvasId, imgId, initialProgress) {
  const canvas = document.getElementById(canvasId);
  const img = document.getElementById(imgId);
  if (!canvas || !img) return null;

  function render(progress, animate) {
    const draw = () => {
      setupCanvas(canvas, img);
      drawHeatmap(canvas, progress, animate);
    };
    if (img.complete && img.naturalWidth) draw();
    else img.addEventListener("load", draw, { once: true });
  }

  render(initialProgress, false);
  return render;
}

function runScanAnimation() {
  const scanLine = document.getElementById("scan-line");
  const viewport = document.getElementById("demo-viewport");
  const canvas = document.getElementById("heatmap-canvas");
  const btn = document.getElementById("scan-btn");
  const badge = document.getElementById("verdict-badge");
  const fill = document.getElementById("confidence-fill");
  const pct = document.getElementById("confidence-pct");
  const heroRender = window.__heroHeatmapRender;

  if (!scanLine || !viewport || btn) {
    btn && (btn.disabled = true);
    return;
  }

  btn.disabled = true;
  btn.textContent = "Scanning…";
  badge.textContent = "Analyzing…";
  badge.className = "verdict-badge verdict-scanning";
  canvas.classList.remove("visible");
  scanLine.classList.add("active");
  viewport.classList.add("scanning");

  setTimeout(() => {
    canvas.classList.add("visible");
    if (heroRender) heroRender(1, true);
  }, 400);

  setTimeout(() => {
    scanLine.classList.remove("active");
    viewport.classList.remove("scanning");
    badge.textContent = "Partially edited";
    badge.className = "verdict-badge verdict-hybrid";
    fill.style.width = "74%";
    pct.textContent = "74%";
    btn.textContent = "Scan again";
    btn.disabled = false;
  }, 2200);
}

document.addEventListener("DOMContentLoaded", () => {
  window.__heroHeatmapRender = initHeatmap("heatmap-canvas", "demo-image", 1);
  initHeatmap("heatmap-canvas-large", "heatmap-image", 1);

  const heroCanvas = document.getElementById("heatmap-canvas");
  const largeCanvas = document.getElementById("heatmap-canvas-large");
  if (heroCanvas) heroCanvas.classList.add("visible");
  if (largeCanvas) largeCanvas.classList.add("visible");

  const scanBtn = document.getElementById("scan-btn");
  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      const canvas = document.getElementById("heatmap-canvas");
      const fill = document.getElementById("confidence-fill");
      const pct = document.getElementById("confidence-pct");
      const badge = document.getElementById("verdict-badge");

      if (scanBtn.textContent === "Scan again") {
        canvas.classList.remove("visible");
        fill.style.width = "0%";
        pct.textContent = "—";
        badge.textContent = "Ready to scan";
        badge.className = "verdict-badge verdict-idle";
        scanBtn.textContent = "Analyze image";
        return;
      }

      runScanAnimation();
    });
  }

  window.addEventListener("resize", () => {
    if (window.__heroHeatmapRender) window.__heroHeatmapRender(1, false);
    initHeatmap("heatmap-canvas-large", "heatmap-image", 1);
  });
});
