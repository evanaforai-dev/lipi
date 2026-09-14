// Two concept GIFs (1:1, 1080²) — composed on the dark workspace, but every PLUGIN panel
// is the real Lipi UI (window.DEMO.plugin(...)), never a hand-built approximation.
//   05-reversible — phone previews हिन्दी ↔ English in place; the real Lipi Preview panel drives it.
//   06-handoff    — Lipi's real reveal panel recommends → the designer's cursor applies on the
//                   component → Lipi's real re-check panel confirms. No auto-fix button.
// Deterministic frame capture (window.__set(t), t∈[0,1]) → ffmpeg → .gif + .mp4.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "./serve.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4609;
const OUT = path.join(__dirname, "concepts");
const SIZE = 1080;
const FPS = 20;

/* ── injected helpers (page scope) ─────────────────────────────────────────── */
function _seg(t, a, b) { const x = (t - a) / (b - a); return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
function _phoneEl(lang, screenId) {
  const d = document.createElement("div");
  d.innerHTML = window.DEMO.render(lang, screenId);
  d.querySelector(".phone").style.boxShadow = "0 30px 70px rgba(0,0,0,.55)";
  return d;
}
// a card that hosts a REAL plugin view
function _pluginCard(view, opts) {
  const card = document.createElement("div");
  card.style.cssText = "width:320px;flex:0 0 auto;background:var(--panel,#fff);border:1px solid var(--line,#e6e8ee);border-radius:15px;overflow:hidden;box-shadow:0 34px 80px rgba(0,0,0,.6);align-self:center;";
  card.innerHTML = window.DEMO.plugin(view, opts || {});
  return card;
}
function _stage() {
  document.getElementById("gif")?.remove();
  const w = document.createElement("div");
  w.id = "gif";
  w.style.cssText =
    "position:fixed;left:0;top:0;width:1080px;height:1080px;z-index:9999;background:#10131a;" +
    "display:flex;flex-direction:row;align-items:center;justify-content:center;gap:60px;padding:64px;box-sizing:border-box;";
  document.body.appendChild(w);
  return w;
}

/* ── Scene A — reversibility (real Lipi Preview panel is the actor) ─────────── */
function sceneReversible() {
  const w = _stage();

  // LEFT — one phone, English underneath, Hindi wiping over it in place
  const col = document.createElement("div");
  col.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:20px;flex:0 0 auto;";
  const frame = document.createElement("div");
  frame.style.cssText = "position:relative;width:250px;height:512px;flex:0 0 auto;";
  const en = _phoneEl("en", "checkout"); en.style.cssText = "position:absolute;inset:0;";
  const hiWrap = document.createElement("div"); hiWrap.style.cssText = "position:absolute;inset:0;";
  const hi = _phoneEl("hi", "checkout"); hi.style.cssText = "position:absolute;inset:0;";
  hiWrap.appendChild(hi); frame.appendChild(en); frame.appendChild(hiWrap);
  const cap = document.createElement("div");
  cap.style.cssText = 'font:500 16px "Noto Sans",Inter,system-ui;color:#98a1b4;text-align:center;';
  col.appendChild(frame); col.appendChild(cap);

  // RIGHT — the real Lipi Preview view
  const card = _pluginCard("preview");

  w.appendChild(col); w.appendChild(card);

  // a single contained accent outline on the localized CTA (stays inside the phone)
  const cta = hi.querySelector('[data-cta="checkout"]');
  if (cta) window.DEMO.fx.highlight(hi.querySelector(".phone"), cta, { color: "var(--accent)" });

  const knob = card.querySelector(".pv-knob");
  const sw = card.querySelector(".pv-switch");
  const dot = card.querySelector(".pv-dot");
  const stxt = card.querySelector(".pv-status-txt");

  window.__set = (t) => {
    let r;                                                // ping-pong → clean loop back to English
    if (t < 0.12) r = 0;
    else if (t < 0.32) r = _seg(t, 0.12, 0.32);
    else if (t < 0.60) r = 1;
    else if (t < 0.80) r = 1 - _seg(t, 0.60, 0.80);
    else r = 0;
    hiWrap.style.clipPath = `inset(0 ${(1 - r) * 100}% 0 0)`;
    hiWrap.style.opacity = String(Math.min(1, r * 1.4));
    cap.textContent = r > 0.5 ? "Checkout · हिन्दी" : "Checkout · English";
    if (knob) knob.style.left = (3 + r * 20) + "px";
    if (sw) sw.style.background = r > 0.5 ? "var(--accent)" : "#d7dbe4";
    if (dot) dot.style.background = r > 0.5 ? "var(--accent)" : "var(--ok)";
    if (stxt) { stxt.textContent = r > 0.5 ? "Previewing हिन्दी · 1 layout issue in view" : "Showing original · English"; stxt.style.color = r > 0.5 ? "var(--ink)" : "var(--muted)"; }
  };
}

/* ── Scene B — the hand-off (real reveal + real re-check panels) ────────────── */
function sceneHandoff() {
  const w = _stage();

  // LEFT — the shared component the designer edits (a canvas component, not plugin UI)
  const card = document.createElement("div");
  card.style.cssText = "width:360px;flex:0 0 auto;background:#fff;border:2px solid var(--accent);border-radius:18px;padding:26px;box-shadow:0 34px 80px rgba(0,0,0,.6);display:flex;flex-direction:column;gap:12px;position:relative;";
  card.innerHTML =
    '<div style="font:600 15px Inter;color:#2a46c4;display:flex;gap:7px;align-items:center">◇ Button / Primary</div>' +
    '<div style="font:600 11px Inter;color:#8a93a6;text-transform:uppercase;letter-spacing:.5px">Main component</div>' +
    '<div style="height:8px"></div>' +
    '<div style="font:10px Inter;color:#9aa2b1;text-transform:uppercase;letter-spacing:.5px">Primary</div>';
  const btn = document.createElement("div");
  btn.textContent = "अपना ऑर्डर कन्फ़र्म करें";
  btn.style.cssText = "background:#ef4b39;color:#fff;font:700 16px var(--indic,'Noto Sans');height:48px;line-height:48px;text-align:center;border-radius:12px;white-space:nowrap;overflow:hidden;box-sizing:border-box;padding:0 20px;";
  card.appendChild(btn);
  const hint = document.createElement("div");
  hint.style.cssText = "font:12px Inter;color:#9aa2b1;"; hint.textContent = "Fixed width · 120px";
  card.appendChild(hint);
  const applied = document.createElement("div");
  applied.style.cssText = "position:absolute;top:20px;right:20px;display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #cfe4d7;border-radius:999px;padding:5px 12px 5px 9px;box-shadow:0 6px 16px rgba(0,0,0,.12);font:700 12px Inter;color:#1f9d57;opacity:0;";
  applied.textContent = "✓ You applied the fix";
  card.appendChild(applied);

  // RIGHT — two REAL Lipi panels: reveal (recommend) → results (re-check), crossfaded
  const panelWrap = document.createElement("div");
  panelWrap.style.cssText = "position:relative;width:320px;height:660px;flex:0 0 auto;align-self:center;";
  const cardCss = "position:absolute;left:0;top:0;width:320px;background:var(--panel,#fff);border:1px solid var(--line,#e6e8ee);border-radius:15px;overflow:hidden;box-shadow:0 34px 80px rgba(0,0,0,.6);";
  const reveal = document.createElement("div"); reveal.style.cssText = cardCss; reveal.innerHTML = window.DEMO.plugin("reveal");
  const resolved = document.createElement("div"); resolved.style.cssText = cardCss + "opacity:0;";
  resolved.innerHTML = window.DEMO.plugin("results", {
    map: window.DEMO.data.recheck.hi, anchorSub: "Down from 11 findings",
    banner: '<div class="banner ok"><span class="b-ic">✓</span><div><div class="b-t">Overflow resolved · 7 fixed · 4 remaining</div><div class="b-m">Re-checked the same screens after your fix.</div></div></div>',
  });
  panelWrap.appendChild(reveal); panelWrap.appendChild(resolved);

  w.appendChild(card); w.appendChild(panelWrap);

  // the designer's cursor
  const cursor = document.createElement("div");
  cursor.style.cssText = "position:absolute;z-index:20;pointer-events:none;transform:translate(-3px,-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.4));";
  cursor.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
  const ring = document.createElement("div");
  ring.style.cssText = "position:absolute;z-index:19;width:44px;height:44px;border-radius:50%;border:2px solid #3e63f0;opacity:0;transform:translate(-50%,-50%);";
  w.appendChild(ring); w.appendChild(cursor);

  const wR = w.getBoundingClientRect();
  const bR = btn.getBoundingClientRect();
  const target = { x: bR.left - wR.left + bR.width / 2, y: bR.top - wR.top + bR.height / 2 };
  const start = { x: 1080 * 0.60, y: 1080 * 0.88 };
  const fullW = Math.ceil(btn.scrollWidth) + 40;
  btn.style.width = "120px";

  window.__set = (t) => {
    const cp = _seg(t, 0.10, 0.40);
    cursor.style.left = (start.x + (target.x - start.x) * cp) + "px";
    cursor.style.top = (start.y + (target.y - start.y) * cp) + "px";
    const click = t > 0.40 && t < 0.50 ? 1 - Math.abs((t - 0.45) / 0.05) : 0;
    ring.style.left = target.x + "px"; ring.style.top = target.y + "px";
    ring.style.opacity = String(click * 0.9); ring.style.width = ring.style.height = (30 + click * 22) + "px";
    const fx = _seg(t, 0.45, 0.63);
    btn.style.width = (120 + (fullW - 120) * fx) + "px";
    hint.textContent = fx > 0.5 ? "Hug contents · sizes to any script" : "Fixed width · 120px";
    hint.style.color = fx > 0.5 ? "#1f9d57" : "#9aa2b1";
    applied.style.opacity = String(_seg(t, 0.55, 0.70));
    const pc = _seg(t, 0.62, 0.78);
    reveal.style.opacity = String(1 - pc);
    resolved.style.opacity = String(pc);
  };
}

const SCENES = [
  { id: "05-reversible", fn: sceneReversible, frames: 80 },
  { id: "06-handoff", fn: sceneHandoff, frames: 92 },
];

async function encode(tmpDir, id) {
  const ffmpeg = (await import("ffmpeg-static")).default;
  const pattern = path.join(tmpDir, "f_%04d.png");
  const gif = path.join(OUT, `${id}.gif`);
  const mp4 = path.join(OUT, `${id}.mp4`);
  const palette = path.join(tmpDir, "palette.png");
  spawnSync(ffmpeg, ["-y", "-framerate", String(FPS), "-i", pattern, "-vf", "scale=960:960:flags=lanczos,palettegen=stats_mode=diff", palette], { stdio: "ignore" });
  const g = spawnSync(ffmpeg, ["-y", "-framerate", String(FPS), "-i", pattern, "-i", palette, "-lavfi", "scale=960:960:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3", "-loop", "0", gif], { stdio: "ignore" });
  const m = spawnSync(ffmpeg, ["-y", "-framerate", String(FPS), "-i", pattern, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-crf", "20", mp4], { stdio: "ignore" });
  return { gif: g.status === 0 ? gif : null, mp4: m.status === 0 ? mp4 : null };
}

async function main() {
  const server = createServer();
  await new Promise((r) => server.listen(PORT, r));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const HELPERS = [["_seg", _seg], ["_phoneEl", _phoneEl], ["_pluginCard", _pluginCard], ["_stage", _stage]]
    .map(([n, f]) => `window.${n} = ${f.toString()};`).join("\n");
  await page.addInitScript({ content: HELPERS });
  await page.goto(`http://localhost:${PORT}/index.html?screenshot=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.DEMO && window.DEMO.initialized, null, { timeout: 15000 });

  for (const s of SCENES) {
    const tmp = fs.mkdtempSync(path.join(__dirname, ".gif-"));
    await page.evaluate(s.fn);
    await page.waitForTimeout(320);
    for (let f = 0; f < s.frames; f++) {
      await page.evaluate((t) => window.__set(t), f / (s.frames - 1));
      await page.waitForTimeout(14);
      await page.screenshot({ path: path.join(tmp, `f_${String(f + 1).padStart(4, "0")}.png`), clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
    }
    const out = await encode(tmp, s.id);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(s.id, "→", out.gif ? "gif ✓" : "gif ✗", out.mp4 ? "mp4 ✓" : "mp4 ✗");
    await page.evaluate(() => document.getElementById("gif")?.remove());
  }

  await browser.close();
  server.close();
  console.log(`\nDone → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
