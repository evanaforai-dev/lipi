// Four super-zoomed 1:1 feature crops (1080×1080), UI only — no captions.
// Chrome (top bar + plugin panel) hidden so the feature floats on the dark canvas.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4607;
const OUT = path.join(__dirname, "features");

const SHOTS = [
  { id: "feature-01-overflow", stage: "06-reveal",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(3) + g.PHONE_W / 2, g.HI_Y + 452, 1.85); } },
  { id: "feature-02-small-text", stage: "17-reveal-small-text",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(0) + g.PHONE_W / 2, g.HI_Y + 300, 1.8); } },
  { id: "feature-03-tofu", stage: "22-reveal-missing-font",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(4) + g.PHONE_W / 2, g.HI_Y + 320, 1.55); } },
  { id: "feature-04-pattern", stage: "07-design-system",
    cam: () => { const g = window.DEMO.geo; window.DEMO.cam(g.frameX(2) + g.PHONE_W / 2 + 30, g.HI_Y + 410, 1.12); } },
];

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });
  // hide the app chrome so the canvas fills the square
  await page.addStyleTag({ content: "#topbar{display:none!important} #plugin{display:none!important}" });
  await page.waitForTimeout(150);

  for (const s of SHOTS) {
    await page.evaluate((st) => window.DEMO.stage(st), s.stage);
    await page.waitForFunction(() => window.DEMO.settled === true, null, { timeout: 15000 });
    await page.evaluate(s.cam);
    await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(OUT, `${s.id}.png`) });
    console.log(s.id);
  }

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
