// Portfolio-quality marketing stills, art-directed as one system:
// case-study frames + cover (beauty shot) + social + thumbnail + poster.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4604;
const OUT = path.join(__dirname, "stills");

const STILLS = [
  { id: "01-hero", stage: "05-results", kicker: "Figma plugin", title: "Localization Pressure Test", cap: "Pressure-test your UI against Indian languages — before you ship.", big: true },
  { id: "02-generate", stage: "01-selection", kicker: "Generate & Test", title: "Select. Localize. Test.", cap: "Pick screens and a language, then generate localized copies." },
  { id: "03-evaluation", stage: "03-analysis-progress", kicker: "Evaluating layouts", title: "It measures geometry — not just text.", cap: "Baselines, bounds and spacing, computed per layer." },
  { id: "04-preview", stage: "04-preview", kicker: "Preview", title: "See it localized — and where it breaks.", cap: "The Hindi checkout button overruns its fixed width." },
  { id: "05-results", stage: "05-results", kicker: "Findings, by screen", title: "Every issue, grouped and revealable.", cap: "Overflow, small text, clipped lines, unsupported fonts." },
  { id: "06-design-system", stage: "07-design-system", kicker: "Root causes", title: "One component, failing across six screens.", cap: "Not a bug list — the systemic cause behind them." },
  { id: "07-recheck", stage: "08-recheck", kicker: "Re-check", title: "Fix once. Watch the count fall.", cap: "11 → 4 after a single component change." },
  { id: "08-export", stage: "09-export", kicker: "Export", title: "Localized screens, ready for handoff.", cap: "Placed beside the originals, as a section." },
];

const OVERLAY_FN = (kicker, title, cap, opts = {}) => {
  document.getElementById("still-overlay")?.remove();
  const o = document.createElement("div");
  o.id = "still-overlay";
  const pos = opts.play
    ? "left:50%; top:50%; transform:translate(-50%,-50%); text-align:center;"
    : `left:${opts.pad || 48}px; bottom:${opts.pad || 44}px;`;
  o.style.cssText = `position:fixed; ${pos} z-index:9998; font-family:Inter,system-ui,sans-serif; pointer-events:none;`;
  const play = opts.play
    ? `<div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.94);box-shadow:0 12px 40px rgba(20,22,27,0.18);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;"><div style="width:0;height:0;border-left:20px solid #14161b;border-top:12px solid transparent;border-bottom:12px solid transparent;margin-left:5px;"></div></div>`
    : "";
  o.innerHTML = `${play}<div style="display:inline-block;text-align:left;background:rgba(255,255,255,0.96);border:1px solid #e9ebef;box-shadow:0 14px 44px rgba(20,22,27,0.12);border-radius:16px;padding:${opts.big ? "26px 30px" : "20px 24px"};max-width:${opts.big ? 620 : 560}px;">
    <div style="font-size:12px;font-weight:600;letter-spacing:0.7px;text-transform:uppercase;color:#3e63f0;margin-bottom:10px;">${kicker}</div>
    <div style="font-size:${opts.big ? 40 : 26}px;font-weight:600;letter-spacing:-0.5px;color:#14161b;line-height:1.14;">${title}</div>
    <div style="font-size:${opts.big ? 16 : 14.5}px;font-weight:400;color:#6b7280;margin-top:9px;line-height:1.45;">${cap}</div>
  </div>`;
  document.body.appendChild(o);
};

async function driveShot(page, stage) {
  await page.evaluate((s) => window.DEMO.stage(s), stage);
  await page.waitForFunction(() => window.DEMO.settled === true, null, { timeout: 15000 });
  await page.waitForTimeout(300);
}

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  async function session(size, work) {
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(`window.__ov = ${OVERLAY_FN.toString()}`);
    await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });
    await work(page);
    await ctx.close();
  }

  // Case-study stills + cover + poster (1280×800 @2 → 2560×1600)
  await session({ width: 1280, height: 800 }, async (page) => {
    for (const s of STILLS) {
      await driveShot(page, s.stage);
      await page.evaluate(([k, t, c, o]) => window.__ov(k, t, c, o), [s.kicker, s.title, s.cap, { big: s.big }]);
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(OUT, `${s.id}.png`) });
      console.log("still", s.id);
    }
    // cover — the beauty shot (design-system view, richest composition)
    await driveShot(page, "07-design-system");
    await page.evaluate(() => window.__ov("Localization Pressure Test", "Find layout issues before you ship.", "One component was breaking six screens. The plugin found it.", { big: true }));
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(OUT, "cover.png") });
    // poster — clean frame for the video (no caption)
    await driveShot(page, "05-results");
    await page.evaluate(() => document.getElementById("still-overlay")?.remove());
    await page.screenshot({ path: path.join(OUT, "poster.png") });
    console.log("cover + poster");
  });

  // social — OG image (1200×630 @2)
  await session({ width: 1200, height: 630 }, async (page) => {
    await driveShot(page, "07-design-system");
    await page.evaluate(() => window.__ov("Localization Pressure Test", "One component. Six screens. One fix.", "Pressure-test UI against Indian languages before you ship.", { big: true, pad: 40 }));
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(OUT, "social.png") });
    console.log("social");
  });

  // thumbnail — 16:9 with a play affordance
  await session({ width: 1280, height: 720 }, async (page) => {
    await driveShot(page, "07-design-system");
    await page.evaluate(() => window.__ov("30-second walkthrough", "See what the plugin discovered.", "", { play: true }));
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(OUT, "thumbnail.png") });
    console.log("thumbnail");
  });

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
