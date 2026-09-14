// Four narrative concept images (1:1, 2160×2160 retina) — composed, UI only, no captions.
// The Lipi plugin panel is the actor in every frame; the canvas screens are what it acts on.
// Reuses the app's real plugin views + screen rendering + analysis overlays via window.DEMO.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4608;
const OUT = path.join(__dirname, "concepts");

/* ── composition helpers (injected into the page via toString) ─────────────── */
// A phone rendered from the real app engine (optionally the fixed/hug-contents variant).
function _phone(lang, screenId, fixed) {
  const d = document.createElement("div");
  d.style.cssText = "transform-origin:top center;";
  d.innerHTML = fixed ? window.DEMO.renderFixed(lang) : window.DEMO.render(lang, screenId);
  d.querySelector(".phone").style.boxShadow = "0 26px 64px rgba(0,0,0,.55)";
  return d;
}
function _label(text) {
  const l = document.createElement("div");
  l.textContent = text;
  l.style.cssText = 'font:500 15px "Noto Sans",Inter,system-ui;color:#98a1b4;text-align:center;';
  return l;
}
// A phone at natural size wrapped with a caption label below.
function _cell(lang, screenId, fixed, scale, labelText) {
  const c = document.createElement("div");
  c.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:13px;flex:0 0 auto;";
  const ph = _phone(lang, screenId, fixed);
  ph.style.transform = `scale(${scale || 1})`;
  c.appendChild(ph);
  if (labelText) c.appendChild(_label(labelText));
  return { cell: c, phone: () => ph.querySelector(".phone") };
}
// A properly-sized thumbnail (layout box = scaled size, so stacking/grids behave).
function _thumb(lang, screenId, fixed, scale, labelText) {
  const col = document.createElement("div");
  col.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:10px;flex:0 0 auto;";
  const box = document.createElement("div");
  box.style.cssText = `width:${250 * scale}px;height:${512 * scale}px;position:relative;flex:0 0 auto;`;
  const inner = _phone(lang, screenId, fixed);
  inner.style.cssText = `transform:scale(${scale});transform-origin:top left;position:absolute;left:0;top:0;`;
  inner.querySelector(".phone").style.boxShadow = "0 20px 46px rgba(0,0,0,.5)";
  box.appendChild(inner);
  col.appendChild(box);
  if (labelText) col.appendChild(_label(labelText));
  return { col, box, phone: () => inner.querySelector(".phone") };
}
function _arrow() {
  const a = document.createElement("div");
  a.textContent = "→";
  a.style.cssText = "color:#8398ff;font-size:46px;font-weight:300;align-self:center;flex:0 0 auto;";
  return a;
}
// The Lipi plugin panel — the product UI — rendered from a real view.
function _plugin(view, opts) {
  const card = document.createElement("div");
  card.style.cssText =
    "width:320px;flex:0 0 auto;background:var(--panel,#fff);border:1px solid var(--line,#e6e8ee);" +
    "border-radius:15px;overflow:hidden;box-shadow:0 34px 80px rgba(0,0,0,.6);align-self:center;";
  card.innerHTML = window.DEMO.plugin(view, opts || {});
  return card;
}
function _base() {
  document.getElementById("concept")?.remove();
  const w = document.createElement("div");
  w.id = "concept";
  w.style.cssText =
    "position:fixed;left:0;top:0;width:1080px;height:1080px;z-index:9999;background:#10131a;" +
    "display:flex;flex-direction:row;align-items:center;justify-content:center;gap:52px;padding:64px;box-sizing:border-box;";
  document.body.appendChild(w);
  return w;
}

/* ── Concept 01 — one design, multiple scripts ─────────────────────────────── */
// LEFT: the same Checkout screen in four scripts, every CTA flagged.
// RIGHT: the plugin's results, four language tabs — it scanned all of them.
function concept01() {
  const w = _base();
  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:26px 30px;flex:0 0 auto;";
  const thumbs = [["hi", "हिन्दी"], ["ta", "தமிழ்"], ["bn", "বাংলা"], ["kn", "ಕನ್ನಡ"]].map(([lang, name]) => {
    const t = _thumb(lang, "checkout", false, 0.5, name);
    grid.appendChild(t.col);
    return t;
  });
  const panel = _plugin("results", { langTabs: ["hi", "ta", "bn", "kn"], activeLang: "hi", anchorSub: "Every script measured" });
  w.appendChild(grid);
  w.appendChild(panel);
  // decorate only once the tree is laid out (offsets are 0 while detached)
  thumbs.forEach((t) => {
    const cta = t.phone().querySelector('[data-cta="checkout"]');
    if (cta) window.DEMO.fx.highlight(t.phone(), cta, { color: "var(--accent)" });
  });
}

/* ── Concept 02 — preview · reveal · compare ───────────────────────────────── */
// LEFT: English (fits) → Hindi (overflows, revealed with the geometry).
// RIGHT: the plugin's reveal panel naming the exact layer + recommendation.
function concept02() {
  const w = _base();
  w.style.gap = "40px";
  const stage = document.createElement("div");
  stage.style.cssText = "display:flex;align-items:center;gap:26px;flex:0 0 auto;";
  const en = _cell("en", "checkout", false, 0.66, "Checkout · English");
  const hi = _cell("hi", "checkout", false, 0.66, "Checkout · हिन्दी");
  stage.appendChild(en.cell); stage.appendChild(_arrow()); stage.appendChild(hi.cell);
  w.appendChild(stage);
  w.appendChild(_plugin("reveal"));
  // decorate after layout
  const p = hi.phone(); const cta = p.querySelector('[data-cta="checkout"]');
  if (cta) {
    window.DEMO.fx.baselineOutline(p, cta, "English 120px", 48);
    window.DEMO.fx.highlight(p, cta, { color: "var(--accent)" });
    window.DEMO.fx.pressureBadge(p, cta, "+48px");
    window.DEMO.fx.measureWidth(p, cta, "needs 168px", { below: false });
  }
}

/* ── Concept 03 — fix · re-check ───────────────────────────────────────────── */
// LEFT: before (clipped, flagged) → after (hug-contents, resolved ✓).
// RIGHT: the plugin's re-check result — 7 fixed · 4 remaining, down from 11.
function concept03() {
  const w = _base();
  w.style.gap = "40px";
  const stage = document.createElement("div");
  stage.style.cssText = "display:flex;align-items:center;gap:26px;flex:0 0 auto;";
  const before = _cell("hi", "checkout", false, 0.66, "Before");
  const after = _cell("hi", "checkout", true, 0.66, "After re-check");
  stage.appendChild(before.cell); stage.appendChild(_arrow()); stage.appendChild(after.cell);
  const panel = _plugin("results", {
    map: window.DEMO.data.recheck.hi,
    anchorSub: "Down from 11 findings",
    banner: `<div class="banner ok"><span class="b-ic">✓</span><div><div class="b-t">7 fixed · 4 remaining</div><div class="b-m">Re-checked the same screens after your fix.</div></div></div>`,
  });
  w.appendChild(stage);
  w.appendChild(panel);
  // decorate after layout
  const pb = before.phone(); const cb = pb.querySelector('[data-cta="checkout"]');
  if (cb) { window.DEMO.fx.highlight(pb, cb, { color: "var(--accent)" }); window.DEMO.fx.pressureBadge(pb, cb, "+48px"); }
  const pa = after.phone();
  const ok = document.createElement("div");
  ok.style.cssText = "position:absolute;top:26px;right:12px;z-index:8;display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #cfe4d7;border-radius:999px;padding:4px 10px 4px 8px;box-shadow:0 6px 16px rgba(0,0,0,.12);font:700 12px Inter;color:#1f9d57;";
  ok.textContent = "✓ Resolved";
  pa.querySelector(".screen").appendChild(ok);
}

/* ── Concept 04 — screen → component → system ──────────────────────────────── */
// LEFT: three screens, each with its own flagged CTA (screen level).
// RIGHT: the plugin's Design System tab — one root cause across all of them.
function concept04() {
  const w = _base();
  w.style.gap = "44px";
  const stack = document.createElement("div");
  stack.style.cssText = "display:flex;flex-direction:column;gap:22px;flex:0 0 auto;";
  const rows = [["restaurant", ".addbtn", "Restaurant"], ["cart", ".cta", "Cart"], ["checkout", '[data-cta="checkout"]', "Checkout"]].map(([s, sel, name]) => {
    const t = _thumb("hi", s, false, 0.46, name);
    t.col.style.flexDirection = "row";
    t.col.style.alignItems = "center";
    t.col.style.gap = "16px";
    stack.appendChild(t.col);
    return { t, sel };
  });
  w.appendChild(stack);
  w.appendChild(_arrow());
  w.appendChild(_plugin("designSystem"));
  // decorate after layout
  rows.forEach(({ t, sel }) => {
    const cta = t.phone().querySelector(sel);
    if (cta) window.DEMO.fx.highlight(t.phone(), cta, { color: "var(--accent)" });
  });
}

const CONCEPTS = [
  { id: "01-multiple-scripts", fn: concept01 },
  { id: "02-preview-reveal", fn: concept02 },
  { id: "03-fix-recheck", fn: concept03 },
  { id: "04-screens-to-system", fn: concept04 },
];

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const HELPERS = [["_phone", _phone], ["_label", _label], ["_cell", _cell], ["_thumb", _thumb], ["_arrow", _arrow], ["_plugin", _plugin], ["_base", _base]]
    .map(([n, f]) => `window.${n} = ${f.toString()};`).join("\n");
  await page.addInitScript({ content: HELPERS });
  await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });

  for (const c of CONCEPTS) {
    await page.evaluate(c.fn);
    await page.waitForTimeout(320);
    await page.screenshot({ path: path.join(OUT, `${c.id}.png`), clip: { x: 0, y: 0, width: 1080, height: 1080 } });
    console.log(c.id);
  }

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
