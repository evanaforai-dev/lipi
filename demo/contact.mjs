// Renders gallery.html (all 15 stills in a grid) and captures it as one contact-sheet PNG.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4601;

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
  await page.goto(`http://localhost:${PORT}/gallery.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const out = path.join(__dirname, "contact-sheet.png");
  await page.screenshot({ path: out, fullPage: true });
  console.log("contact sheet →", out);

  await browser.close();
  server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
