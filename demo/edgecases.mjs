// Four edge-case plugin stills (1:1, 2160²) — the real Lipi panel only, centered on the
// dark workspace. The messy parts of a real design system, handled as part of the workflow.
//   07 no-frames · 08 api-key · 09 external-library · 10 no-issues
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4611;
const OUT = path.join(__dirname, "concepts");

/* ── injected helpers ──────────────────────────────────────────────────────── */
function _stage() {
  document.getElementById("edge")?.remove();
  const w = document.createElement("div");
  w.id = "edge";
  w.style.cssText =
    "position:fixed;left:0;top:0;width:1080px;height:1080px;z-index:9999;background:#10131a;" +
    "display:flex;align-items:center;justify-content:center;padding:64px;box-sizing:border-box;";
  document.body.appendChild(w);
  return w;
}
// the real Lipi panel, centered and scaled to sit comfortably on the square
function _panel(view, opts) {
  const w = _stage();
  const card = document.createElement("div");
  card.style.cssText = "width:320px;background:var(--panel,#fff);border:1px solid var(--line,#e6e8ee);border-radius:16px;overflow:hidden;box-shadow:0 44px 100px rgba(0,0,0,.62);transform-origin:center center;";
  card.innerHTML = window.DEMO.plugin(view, opts || {});
  w.appendChild(card);
  const h = card.offsetHeight;
  const scale = Math.min(1.5, 950 / h);   // cap width (1.5×320=480) or fit height, whichever is smaller
  card.style.transform = `scale(${scale})`;
}

/* ── the four edge cases (plugin only) ─────────────────────────────────────── */
function edgeNoFrames() { _panel("generateError"); }                 // 07 — Lipi guards
function edgeApiKey() { _panel("generateKey"); }                     // 08 — dependency surfaced
function edgeExternal() { _panel("designSystem", { failIndex: 0 }); } // 09 — can't jump, says why
function edgeNoIssues() { _panel("noIssues"); }                      // 10 — empty result is a real result

const EDGES = [
  { id: "07-no-frames", fn: edgeNoFrames },
  { id: "08-api-key", fn: edgeApiKey },
  { id: "09-external-library", fn: edgeExternal },
  { id: "10-no-issues", fn: edgeNoIssues },
];

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const HELPERS = [["_stage", _stage], ["_panel", _panel]]
    .map(([n, f]) => `window.${n} = ${f.toString()};`).join("\n");
  await page.addInitScript({ content: HELPERS });
  await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });

  for (const e of EDGES) {
    await page.evaluate(e.fn);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${e.id}.png`), clip: { x: 0, y: 0, width: 1080, height: 1080 } });
    console.log(e.id);
  }

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
