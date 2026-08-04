// Drives the demo through every stage and captures a crisp 2560×1600 PNG per stage.
// Deterministic: waits for each stage's animations to settle before shooting.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4599;
const OUT = path.join(__dirname, "screenshots");

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  // 1280×800 logical @ 2× device scale ⇒ 2560×1600 crisp PNGs.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });

  const stages = await page.evaluate(() => window.DEMO.stages);
  for (const id of stages) {
    // Run the stage and wait until it reports settled (all animations complete).
    await page.evaluate((s) => window.DEMO.stage(s), id);
    await page.waitForFunction(() => window.DEMO.settled === true, null, { timeout: 15000 });
    await page.waitForTimeout(350); // let final paint land
    const file = path.join(OUT, `${id}.png`);
    await page.screenshot({ path: file });
    console.log("captured", `${id}.png`);
  }

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
