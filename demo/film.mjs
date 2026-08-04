// Records the curated 30-second portfolio film (?film=1) → demo-film.mp4 + .webm.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4603;
const SIZE = { width: 1280, height: 800 };

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  const tmp = path.join(__dirname, ".film-tmp");
  fs.mkdirSync(tmp, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: tmp, size: SIZE } });
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/index.html?film=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });

  console.log("filming (~30s)…");
  await page.waitForFunction(() => window.DEMO.finished === true, null, { timeout: 60000 });
  await page.waitForTimeout(400);

  const video = page.video();
  await context.close();
  const webm = path.join(__dirname, "demo-film.webm");
  await video.saveAs(webm);
  await video.delete();
  fs.rmSync(tmp, { recursive: true, force: true });
  await browser.close();
  server.close();
  console.log("webm →", webm);

  const mp4 = path.join(__dirname, "demo-film.mp4");
  try {
    const ffmpeg = (await import("ffmpeg-static")).default;
    const r = spawnSync(ffmpeg, ["-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-crf", "20", "-r", "30", mp4], { stdio: "ignore" });
    if (r.status === 0) console.log("mp4  →", mp4);
    else console.warn("mp4 conversion skipped — keeping .webm");
  } catch {
    console.warn("mp4 conversion skipped (ffmpeg-static not installed) — keeping .webm");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
