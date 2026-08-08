// Case-study / marketing ASSETS — clean, UI-only (no cinematic captions or headlines).
// The product UI is the hero; "Lipi" branding lives inside the plugin panel itself.
// (The comprehensive per-state documentation set is the walkthrough `screenshots/`.)
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4604;
const OUT = path.join(__dirname, "stills");

async function driveShot(page, stage, cam) {
  await page.evaluate((s) => window.DEMO.stage(s), stage);
  await page.waitForFunction(() => window.DEMO.settled === true, null, { timeout: 15000 });
  if (cam) await page.evaluate(cam);
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
    await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });
    await work(page);
    await ctx.close();
  }

  // cover (beauty shot) + poster (video poster) — 1280×800 @2 → 2560×1600
  await session({ width: 1280, height: 800 }, async (page) => {
    await driveShot(page, "07-design-system"); // richest composition: illuminated component + DS panel + Lipi
    await page.screenshot({ path: path.join(OUT, "cover.png") });
    console.log("cover");
    await driveShot(page, "05-results"); // clean results overview
    await page.screenshot({ path: path.join(OUT, "poster.png") });
    console.log("poster");
  });

  // social / OG (1200×630 @2 → 2400×1260)
  await session({ width: 1200, height: 630 }, async (page) => {
    await driveShot(page, "07-design-system");
    await page.screenshot({ path: path.join(OUT, "social.png") });
    console.log("social");
  });

  // thumbnail (16:9 → 2560×1440)
  await session({ width: 1280, height: 720 }, async (page) => {
    await driveShot(page, "07-design-system");
    await page.screenshot({ path: path.join(OUT, "thumbnail.png") });
    console.log("thumbnail");
  });

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
