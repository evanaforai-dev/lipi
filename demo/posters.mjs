// Parallel exploration: premium software-launch POSTERS.
// The plugin is the product; Figma is only atmosphere. Dark workspace, aggressive
// crop, one focal point, negative space carrying a keynote title.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4605;
const OUT = path.join(__dirname, "posters");

// Injected in-page: dark theme + vignette + keynote title.
const POSTERIZE = (cfg) => {
  ["poster-style", "poster-vig", "poster-title"].forEach((id) => document.getElementById(id)?.remove());
  const st = document.createElement("style");
  st.id = "poster-style";
  st.textContent = `
    body, #canvas { background:#090b11 !important; }
    #canvas { background-image:none !important; }
    #topbar { background:#0b0d14 !important; border-bottom-color:#161a24 !important; color:#4a505e !important; }
    #topbar .tb-file { color:#7a8394 !important; } #topbar .tb-logo { color:#3e63f0 !important; }
    #topbar .tb-center, #topbar .tb-share, #topbar .tb-avatar { opacity:.45; }
    .phone { box-shadow: 0 50px 130px rgba(0,0,0,.7) !important; }
    #plugin { box-shadow: -24px 0 90px rgba(0,0,0,.55); border-left-color:#161a24 !important; ${cfg.dimPlugin ? "filter: brightness(.42) saturate(.9);" : ""} }
  `;
  document.head.appendChild(st);
  // radial spotlight on the focal point + a directional scrim so the title always sits on dark
  const scrim = {
    "left-bottom": "linear-gradient(to top, rgba(9,11,17,.97) 4%, rgba(9,11,17,.6) 26%, transparent 46%), linear-gradient(to right, rgba(9,11,17,.92) 0%, rgba(9,11,17,.5) 26%, transparent 46%)",
    "left-center": "linear-gradient(to right, rgba(9,11,17,.97) 0%, rgba(9,11,17,.78) 26%, rgba(9,11,17,.35) 44%, transparent 58%)",
    "right-center": "linear-gradient(to left, rgba(9,11,17,.97) 0%, rgba(9,11,17,.78) 26%, rgba(9,11,17,.35) 44%, transparent 58%)",
    "center-bottom": "linear-gradient(to top, rgba(9,11,17,.97) 4%, rgba(9,11,17,.5) 30%, transparent 50%)",
  }[cfg.titlePos || "left-bottom"];
  const vig = document.createElement("div");
  vig.id = "poster-vig";
  vig.style.cssText = `position:fixed; inset:0; z-index:40; pointer-events:none;
    background: ${scrim}, radial-gradient(140% 130% at ${cfg.spotlight || "50% 46%"}, rgba(9,11,17,0) 0%, rgba(9,11,17,0) 26%, rgba(9,11,17,.62) 64%, rgba(9,11,17,.95) 100%);`;
  document.body.appendChild(vig);
  const pos = {
    "left-bottom": "left:76px; bottom:76px; text-align:left;",
    "left-center": "left:76px; top:50%; transform:translateY(-50%); text-align:left;",
    "right-center": "right:372px; top:50%; transform:translateY(-50%); text-align:right;",
    "center-bottom": "left:50%; bottom:88px; transform:translateX(-50%); text-align:center;",
  }[cfg.titlePos || "left-bottom"];
  const t = document.createElement("div");
  t.id = "poster-title";
  t.style.cssText = `position:fixed; ${pos} z-index:50; max-width:${cfg.titleW || 640}px; font-family:Inter,system-ui,sans-serif;`;
  const alignSub = cfg.titlePos === "right-center" ? "margin-left:auto;" : cfg.titlePos === "center-bottom" ? "margin:20px auto 0;" : "";
  t.innerHTML = `
    <div style="font-size:13px;font-weight:600;letter-spacing:2.4px;text-transform:uppercase;color:#8091f7;margin-bottom:18px;">${cfg.kicker}</div>
    <div style="font-size:${cfg.size || 58}px;font-weight:600;letter-spacing:-1.2px;color:#f5f7fc;line-height:1.04;white-space:pre-line;">${cfg.title}</div>
    ${cfg.sub ? `<div style="font-size:18px;font-weight:400;color:#98a1b3;margin-top:20px;line-height:1.5;max-width:500px;${alignSub}">${cfg.sub}</div>` : ""}`;
  document.body.appendChild(t);
};

async function driveShot(page, stage) {
  await page.evaluate((s) => window.DEMO.stage(s), stage);
  await page.waitForFunction(() => window.DEMO.settled === true, null, { timeout: 15000 });
  await page.waitForTimeout(250);
}

// each: { id, stage, cam(page-side geo → DEMO.cam), cfg }
const POSTERS = [
  { id: "01-the-break", stage: "06-reveal",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(3) + g.PHONE_W / 2 - 60, g.HI_Y + 470, 1.85); },
    cfg: { spotlight: "64% 52%", dimPlugin: true, kicker: "Lipi", title: "This button\njust broke.", sub: "Hindi runs longer than English. Most fixed-width layouts aren’t ready for it.", titlePos: "left-bottom" } },
  { id: "02-the-pattern", stage: "07-design-system",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(2) + g.PHONE_W / 2, g.HI_Y + 150, 0.82); },
    cfg: { spotlight: "68% 40%", dimPlugin: false, kicker: "Root cause", title: "One component.\nSix screens.", sub: "It doesn’t hand you a bug list. It finds the pattern behind them.", titlePos: "left-bottom" } },
  { id: "03-the-product", stage: "05-results",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(1) - 150, g.HI_Y + 230, 0.56); },
    cfg: { spotlight: "84% 48%", dimPlugin: false, kicker: "Figma plugin", title: "Meet\nLipi.", sub: "Pressure-test your UI against Indian languages — before you ship.", titlePos: "left-center", titleW: 560 } },
  { id: "04-measured", stage: "17-reveal-small-text",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(0) - 205, g.HI_Y + 236, 1.02); },
    cfg: { spotlight: "72% 50%", dimPlugin: true, kicker: "Delta engine", title: "Measured,\nnot translated.", sub: "Baselines, bounds and spacing — computed per layer.", titlePos: "left-center", titleW: 560 } },
];

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  async function session(size, work) {
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });
    await work(page);
    await ctx.close();
  }

  // landscape keynote posters (1280×800 @2 → 2560×1600)
  await session({ width: 1280, height: 800 }, async (page) => {
    for (const p of POSTERS) {
      await driveShot(page, p.stage);
      await page.evaluate(p.cam);
      await page.waitForTimeout(120);
      await page.evaluate(POSTERIZE, p.cfg);
      await page.waitForTimeout(120);
      await page.screenshot({ path: path.join(OUT, `${p.id}.png`) });
      console.log("poster", p.id);
    }
  });

  // portrait publication cover (1080×1350 @2 → 2160×2700)
  await session({ width: 1080, height: 1350 }, async (page) => {
    await driveShot(page, "07-design-system");
    await page.evaluate(() => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(3), g.HI_Y + 300, 0.6); });
    await page.waitForTimeout(120);
    await page.evaluate(POSTERIZE, { spotlight: "58% 34%", dimPlugin: false, kicker: "Lipi", title: "Ship in\nany language.", sub: "One component was breaking six screens. The plugin found it.", titlePos: "center-bottom", size: 62, titleW: 760 });
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(OUT, "05-cover-portrait.png") });
    console.log("poster 05-cover-portrait");
  });

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
