// Records the animated autoplay walkthrough (camera pans, progress, counters, reveal pulse)
// to a single .webm — a real demo video, no ffmpeg needed.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4602;
const SIZE = { width: 1280, height: 800 };

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  const tmp = path.join(__dirname, ".video-tmp");
  fs.mkdirSync(tmp, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    recordVideo: { dir: tmp, size: SIZE },
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/index.html?autoplay=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });

  console.log("recording autoplay… (~50s)");
  await page.waitForFunction(() => window.DEMO.finished === true, null, { timeout: 180000 });
  await page.waitForTimeout(1200);

  const video = page.video();
  await context.close(); // finalizes the .webm
  const dest = path.join(__dirname, "demo-walkthrough.webm");
  await video.saveAs(dest);
  await video.delete();
  fs.rmSync(tmp, { recursive: true, force: true });

  await browser.close();
  server.close();
  console.log("webm →", dest);

  // Convert to a universally-playable MP4 (H.264) with the bundled ffmpeg binary.
  const mp4 = path.join(__dirname, "demo-walkthrough.mp4");
  try {
    const ffmpeg = (await import("ffmpeg-static")).default;
    const r = spawnSync(ffmpeg, [
      "-y", "-i", dest,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-crf", "22", "-r", "30", mp4,
    ], { stdio: "ignore" });
    if (r.status === 0) console.log("mp4  →", mp4);
    else console.warn("mp4 conversion skipped (ffmpeg failed) — keeping .webm");
  } catch {
    console.warn("mp4 conversion skipped (ffmpeg-static not installed) — keeping .webm");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
