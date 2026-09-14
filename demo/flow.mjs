// Captures the user-flow diagram as a high-res downloadable PNG.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4606;

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1560, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/user-flow.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const out = path.join(__dirname, "user-flow.png");
  await page.screenshot({ path: out, fullPage: true });
  console.log("user-flow →", out);
  await browser.close();
  server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
