// Landscape "System Design" board (2560×1440) — how Lipi's system is CONSTRUCTED for scanning
// and decisions: the design principles, the anatomy of the two atomic cards (finding = scan,
// root cause = decide), and a semantic colour-meaning rail. Built from the real plugin classes.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4612;
const OUT = path.join(__dirname, "concepts");

function build() {
  const MONO = "font-family:ui-monospace,'SF Mono',Menlo,monospace;";
  document.getElementById("board")?.remove();
  const w = document.createElement("div");
  w.id = "board";
  w.style.cssText =
    "position:fixed;left:0;top:0;width:1280px;height:720px;z-index:9999;background:#0e1118;" +
    "background-image:linear-gradient(rgba(155,166,186,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(155,166,186,.05) 1px,transparent 1px);" +
    "background-size:40px 40px;overflow:hidden;color:#f2f4f8;";
  document.body.appendChild(w);

  const el = (html, x, y, extra = "") => {
    const d = document.createElement("div");
    d.innerHTML = html;
    d.style.cssText = `position:absolute;left:${x}px;top:${y}px;${extra}`;
    w.appendChild(d);
    return d;
  };
  const kicker = (t, x, y) => el(`<span style="${MONO}font-size:11px;letter-spacing:1.6px;color:#7f899a">${t}</span>`, x, y);

  // a real plugin card (built from the actual CSS classes) on a white panel, scaled.
  // color:#14161b so card parts that inherit their colour render dark on white.
  const panel = (inner, x, y, s, wpx = 300) => {
    const box = document.createElement("div");
    box.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${wpx}px;background:#fff;color:#14161b;border:1px solid #e6e8ee;border-radius:12px;padding:14px;box-shadow:0 24px 58px rgba(0,0,0,.5);transform:scale(${s});transform-origin:top left;`;
    box.innerHTML = inner;
    w.appendChild(box);
    return box;
  };
  // leader line + label aligned to a part inside a (scaled) card
  const annotate = (box, items, labelX, fromX) => {
    const br = w.getBoundingClientRect();
    items.forEach(([sel, text]) => {
      const part = box.querySelector(sel);
      if (!part) return;
      const r = part.getBoundingClientRect();
      const y = Math.round(r.top - br.top + r.height / 2);
      el(`<div style="width:6px;height:6px;border-radius:50%;background:#3e63f0"></div>`, fromX - 3, y - 3);
      el(`<div style="width:${labelX - fromX}px;height:1px;background:#39425a"></div>`, fromX, y);
      el(`<span style="${MONO}font-size:11.5px;color:#aeb6c4">${text}</span>`, labelX + 8, y - 8);
    });
  };

  // ── title ─────────────────────────────────────────────────────────────────
  el(`<div style="${MONO}font-size:26px;font-weight:600;letter-spacing:1px;color:#f2f4f8">SYSTEM&nbsp;&nbsp;DESIGN</div>`, 48, 36);

  // ── principles (how the system is meant to be used) ──────────────────────
  const pillar = (t, lines, x, y) => {
    kicker(t, x, y);
    lines.forEach((l, i) => el(`<span style="font:400 14px Inter;color:#c7cdd8">${l}</span>`, x, y + 24 + i * 23));
  };
  pillar("SCAN", ["One number, one accent", "Every card, the same shape", "Type named, never colour-coded"], 48, 96);
  pillar("DECIDE", ["Scope shows the blast radius", "A recommendation, not an auto-fix", "Two lenses — by screen, by system"], 48, 232);
  pillar("VERIFY", ["Re-check counts down from the original", "Green is earned, not assumed"], 48, 368);
  kicker("FOUNDATIONS", 48, 480);
  el(`<span style="font:400 14px Inter;color:#c7cdd8">8px grid · Inter / Noto Sans</span>`, 48, 504);

  // ── the finding card — the unit you SCAN ─────────────────────────────────
  kicker("THE FINDING CARD  ·  SCAN", 452, 100);
  const scard = `<div class="scard"><div class="s-top"><span class="s-name">Checkout</span><span class="s-count"><b>3</b> findings</span><span style="opacity:.4">›</span></div>
    <div class="s-sum"><span><span class="dot" style="background:var(--accent)"></span>Text overflow</span><span><span class="dot" style="background:var(--accent)"></span>Text too small</span><span><span class="dot" style="background:var(--accent)"></span>Clipped lines</span></div></div>`;
  const FS = 1.18, fb = panel(scard, 452, 130, FS, 300);
  annotate(fb, [[".s-top", "Name + count · glance"], [".s-sum", "Named · one accent"]], 832, 452 + 300 * FS);

  // ── the root-cause card — the unit you DECIDE on ─────────────────────────
  kicker("THE ROOT-CAUSE CARD  ·  DECIDE", 452, 300);
  const dcard = `<div class="dcard"><div class="rv-kicker"><span class="dot" style="background:var(--accent)"></span>Fixed-width buttons</div>
    <div class="d-title">Let buttons size to their label</div>
    <div class="d-desc">Hindi labels exceed fixed button widths, so text clips or the frame grows.</div>
    <div class="d-scope">Appears in 6 screens</div>
    <div class="d-rec"><b>Recommended</b> · Use intrinsic (hug-contents) sizing.</div>
    <div class="d-actions"><span class="linklike">◎ Reveal</span><span class="linklike">Go to component →</span></div></div>`;
  const DS = 1.12, db = panel(dcard, 452, 330, DS, 300);
  annotate(db, [[".rv-kicker", "The pattern"], [".d-scope", "Blast radius"], [".d-rec", "Guidance, not auto-fix"], [".d-actions", "You act"]], 810, 452 + 300 * DS);

  // ── colour · meaning (semantic, far right) ───────────────────────────────
  kicker("COLOUR · MEANING", 1044, 44);
  const rows = [
    ["#3E63F0", "Accent", "attention · all types"],
    ["#1F9D57", "Resolved", "fixed, after re-check"],
    ["#EF4B39", "Content", "product content only"],
    ["#14161B", "Ink", "primary text"],
    ["#6B7280", "Muted", "secondary text"],
    ["#E9EBEF", "Line", "dividers · borders"],
  ];
  rows.forEach(([hex, name, mean], i) => {
    const y = 74 + i * 40;
    el(`<span style="display:block;width:20px;height:20px;border-radius:5px;background:${hex};border:1px solid rgba(255,255,255,.16)"></span>`, 1044, y);
    el(`<span style="font:600 13px Inter;color:#e6e9ef">${name}</span>`, 1074, y);
    el(`<span style="${MONO}font-size:10.5px;color:#7f899a">${mean}</span>`, 1074, y + 18);
  });

  // ── type ───────────────────────────────────────────────────────────────────
  kicker("TYPE", 1044, 336);
  el(`<span style="font:600 30px Inter;color:#f2f4f8">Ag</span>`, 1044, 360);
  el(`<span style="font:600 13px Inter;color:#e6e9ef">Inter</span><br><span style="${MONO}font-size:10.5px;color:#7f899a">UI · Latin</span>`, 1104, 366);
  el(`<span style="font:600 30px var(--indic),'Noto Sans';color:#f2f4f8">आ</span>`, 1044, 410);
  el(`<span style="font:600 13px Inter;color:#e6e9ef">Noto Sans</span><br><span style="${MONO}font-size:10.5px;color:#7f899a">Indic scripts</span>`, 1104, 416);

  // ── the scan ladder: glance → lens → specifics ───────────────────────────
  kicker("SCAN LADDER", 1044, 500);
  el(`<span style="font:700 30px Inter;color:#3e63f0">11</span><span style="font:600 12px Inter;color:#9aa1ab"> findings</span>`, 1044, 524);
  el(`<span style="${MONO}font-size:10.5px;color:#7f899a">01 · glance — one number</span>`, 1044, 566);
  el(`<div style="display:inline-flex;background:#eef1fe;border:1px solid #d4dcfb;border-radius:7px;overflow:hidden;font:600 11px Inter"><span style="padding:5px 10px;background:#3e63f0;color:#fff">Screens</span><span style="padding:5px 10px;color:#2a46c4">System</span></div>`, 1044, 588);
  el(`<span style="${MONO}font-size:10.5px;color:#7f899a">02 · lens — by screen / system</span>`, 1044, 624);
  el(`<span style="${MONO}font-size:10.5px;color:#7f899a">03 · specifics — the cards</span>`, 1044, 648);
}

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript({ content: `window.build = ${build.toString()};` });
  await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });
  await page.evaluate(() => window.build());
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, "00-system-design.png"), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log("00-system-design");

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
