/* ============================================================================
   Lipi — fake product demo (no Figma, no network).
   A deterministic stage machine drives a fake canvas + plugin. Playwright (or
   autoplay) walks the stages and captures a screenshot after each.
   ========================================================================== */

let DATA = null;
// One accent for every issue type — types are distinguished by name, never by competing colour.
const TYPE_COLOR = { overflow: "var(--accent)", small: "var(--accent)", clip: "var(--accent)", font: "var(--accent)" };
const TYPE_LABEL = { overflow: "Text overflow", small: "Text too small", clip: "Clipped lines", font: "Unsupported font" };

const world = () => document.getElementById("world");
const canvasEl = () => document.getElementById("canvas");
const pluginEl = () => document.getElementById("plugin");
const zoomEl = () => document.getElementById("tb-zoom");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Two-frame settle via setTimeout (not rAF, which pauses when the tab is backgrounded).
const raf = () => new Promise((r) => setTimeout(r, 32));

// world geometry ------------------------------------------------------------
const COL = 300; // x spacing between frames
const PHONE_W = 250;
const EN_Y = 0;
const HI_Y = 620; // hindi row lives below the english row
const TA_Y = 1240; // tamil row below hindi (bilingual runs)
const ROW_Y = { en: EN_Y, hi: HI_Y, ta: TA_Y };
const LANG_LABEL = { hi: "हिन्दी", ta: "தமிழ்", bn: "বাংলা", kn: "ಕನ್ನಡ" };
// before/after comparison pair lives in its own clear area
const BA_Y = 1900;
// main component lives to the left of the artboards (Go to component target)
const COMP_X = -440;
const COMP_Y = 620;

function frameX(i) { return i * COL; }
// per-language findings, resolved after DATA loads
let FINDINGS = {};
let RECHECK = {};

// translation ---------------------------------------------------------------
function T(key, lang) {
  if (!lang || lang === "en") return key;
  const d = DATA.translations[lang];
  return (d && d[key]) || key;
}

/* ---- Food-app screen templates ------------------------------------------ */
function statusbar() {
  return `<div class="statusbar"><span>9:41</span><span class="sb-dots">●●● ⌁ 100%</span></div>`;
}
function navbar(active) {
  const items = [["Home", "⌂"], ["Search", "⌕"], ["Cart", "🛒"], ["Orders", "🧾"], ["Profile", "◔"]];
  return `<div class="navbar">${items
    .map(([k, ic]) => `<i class="${k.toLowerCase() === active ? "on" : ""}">${ic}</i>`)
    .join("")}</div>`;
}

function homeHTML(L) {
  const cats = DATA.categories
    .map((c) => `<div class="cat"><div class="cat-ic">${c.emoji}</div><span>${T(c.name, L)}</span></div>`)
    .join("");
  const rests = DATA.restaurants
    .slice(0, 2)
    .map(
      (r) => `<div class="rcard"><div class="thumb">${r.emoji}<span class="free">${T("Free delivery", L)}</span></div>
      <div class="rc-body"><div class="rc-top"><span class="rc-name">${r.name}</span><span class="rating">★ ${r.rating}</span></div>
      <div class="rc-meta">${T(r.cuisine, L)} · ${r.time} ${T("mins", L)}</div></div></div>`
    )
    .join("");
  return `<div class="body">
    <div class="loc"><small>${T("Delivery to", L)}</small><b>${T("Home", L)} · MG Road ▾</b></div>
    <div class="search">⌕ ${T("Search for dishes, restaurants", L)}</div>
    <div class="cats">${cats}</div>
    <div class="sec-h">${T("Top rated near you", L)}</div>
    ${rests}
  </div>${navbar("home")}`;
}

function restaurantHTML(L) {
  const items = DATA.items
    .map(
      (it) => `<div class="item"><div class="it-l">
        ${it.tag ? `<div class="it-tag">${T(it.tag, L)}</div>` : ""}
        <div class="it-name">${it.name}</div><div class="it-price">${it.price}</div></div>
      <div class="it-r"><div class="it-thumb">${it.emoji}</div><div class="addbtn">${T("Add", L)}</div></div></div>`
    )
    .join("");
  return `<div class="body">
    <div class="hero">🍛</div>
    <div class="rest-head"><div class="rh-name">Spice Garden</div>
      <div class="rh-meta">${T("South Indian", L)} · ${T("Biryani", L)} · 30 ${T("mins", L)}</div>
      <span class="rating">★ 4.5</span></div>
    <div class="mtabs"><span class="on">${T("Recommended", L)}</span><span>${T("Biryani", L)}</span></div>
    ${items}
  </div>`;
}

function cartHTML(L) {
  const rows = DATA.cart
    .map(
      (c) => `<div class="crow"><div class="c-th">${c.emoji}</div>
      <div><div class="c-name">${c.name}</div><div class="c-qty">${T("Qty", L) || "Qty"} · ${c.qty}</div></div>
      <div class="c-price">${c.price}</div></div>`
    )
    .join("");
  return `<div class="body">
    <div class="scr-title">${T("Your Cart", L)}</div>
    ${rows}
    <div class="bill">
      <div class="brow"><span>${T("Subtotal", L)}</span><span>₹340</span></div>
      <div class="brow"><span>${T("Delivery Fee", L)}</span><span>₹30</span></div>
      <div class="brow"><span>${T("Taxes & Charges", L)}</span><span>₹28</span></div>
      <div class="brow total"><span>${T("To Pay", L)}</span><span>₹398</span></div>
    </div>
    <button class="cta">${T("Proceed to Checkout", L)}</button>
  </div>`;
}

function checkoutHTML(L) {
  return `<div class="body">
    <div class="scr-title">${T("Checkout", L)}</div>
    <div class="co-card"><div class="co-top"><small>${T("Delivery Address", L)}</small><span class="co-change">${T("Change", L)}</span></div>
      <b>${T("Home", L)}</b><div class="co-sub addr">${T("42, MG Road, Indiranagar, Bengaluru 560038", L)}</div></div>
    <div class="co-card"><small>${T("Payment Method", L)}</small><b>•••• •••• •••• 4242</b></div>
    <div class="co-card co-sum"><small>${T("Order Summary", L)}</small>
      <div style="height:6px"></div>
      <div class="brow"><span>${T("Subtotal", L)}</span><span>₹340</span></div>
      <div class="brow total"><span>${T("Total", L)}</span><span>₹398</span></div></div>
    <button class="cta fixed" data-cta="checkout">${T("Place Order", L)}</button>
  </div>`;
}

function ordersHTML(L) {
  const indic = L !== "en";
  // A tag whose font lacks glyphs for the script → renders as tofu boxes (missing-font).
  const tag = indic ? `<span class="otag tofu">▯ ▯ ▯ ▯</span>` : `<span class="otag">Fastest</span>`;
  const cards = DATA.orders
    .map((o) => {
      const done = o.status === "Delivered";
      return `<div class="ocard"><div class="o-top"><div class="o-th">${o.emoji}</div>
        <div style="flex:1"><div class="o-name">${o.name}</div><div class="o-items">${o.items}</div></div>
        <span class="pill ${done ? "done" : "way"}">${T(o.status, L)}</span></div>
        <div class="o-foot"><span class="o-foot-l">${tag}<span class="muted" style="font-size:11px">2 items</span></span>
        <span class="reorder">${T("Reorder", L)}</span></div></div>`;
    })
    .join("");
  return `<div class="body"><div class="scr-title">${T("Your Orders", L)}</div>${cards}</div>${navbar("orders")}`;
}

function profileHTML(L) {
  const rows = DATA.profileRows
    .map((r) => `<div class="prow"><span>${r.emoji}&nbsp;&nbsp;${T(r.name, L)}</span><span class="p-r">›</span></div>`)
    .join("");
  return `<div class="body">
    <div class="prof-head"><div class="avatar-lg">A</div><div><b>Aarav Sharma</b><div class="muted" style="font-size:11px">+91 98765 43210</div></div></div>
    ${rows}
    <button class="logout">${T("Log Out", L)}</button>
  </div>${navbar("profile")}`;
}

// "After the fix" — the CTA hugs its label (intrinsic width) so the full string shows.
function checkoutFixedHTML(L) {
  return `<div class="body">
    <div class="scr-title">${T("Checkout", L)}</div>
    <div class="co-card"><div class="co-top"><small>${T("Delivery Address", L)}</small><span class="co-change">${T("Change", L)}</span></div>
      <b>${T("Home", L)}</b><div class="co-sub">${T("42, MG Road, Indiranagar, Bengaluru 560038", L)}</div></div>
    <div class="co-card"><small>${T("Payment Method", L)}</small><b>•••• •••• •••• 4242</b></div>
    <div class="co-card co-sum"><small>${T("Order Summary", L)}</small>
      <div style="height:6px"></div>
      <div class="brow"><span>${T("Subtotal", L)}</span><span>₹340</span></div>
      <div class="brow total"><span>${T("Total", L)}</span><span>₹398</span></div></div>
    <div style="text-align:center"><button class="cta hug">${T("Place Order", L)}</button></div>
  </div>`;
}

const TEMPLATES = { home: homeHTML, restaurant: restaurantHTML, cart: cartHTML, checkout: checkoutHTML, orders: ordersHTML, profile: profileHTML };

function phoneHTML(screen, lang) {
  const indic = lang !== "en";
  return `<div class="phone"><div class="screen ${indic ? "indic" : ""}">${statusbar()}${TEMPLATES[screen.type](lang)}</div></div>`;
}

/* ---- Build the canvas world --------------------------------------------- */
function buildWorld() {
  const w = world();
  w.innerHTML = "";

  // export section wrappers (behind the localized rows, hidden until export)
  const lastX = frameX(DATA.screens.length - 1) + PHONE_W;
  w.appendChild(sectionEl("section", HI_Y, "हिन्दी · 6 screens", lastX));
  w.appendChild(sectionEl("section2", TA_Y, "தமிழ் · 6 screens", lastX));

  // alignment guide + a spacing label between first two english frames
  const guide = document.createElement("div");
  guide.className = "guide-v";
  guide.style.left = frameX(1) - 25 + "px";
  guide.style.top = "-40px";
  guide.style.height = HI_Y + 560 + "px";
  w.appendChild(guide);

  const sp = document.createElement("div");
  sp.className = "spacing";
  sp.style.left = frameX(0) + PHONE_W + "px";
  sp.style.top = "270px";
  sp.style.width = COL - PHONE_W + "px";
  sp.innerHTML = `<span class="bar"></span><span class="val">50</span><span class="bar"></span>`;
  w.appendChild(sp);

  // english + hindi + tamil artboards
  DATA.screens.forEach((s, i) => {
    w.appendChild(artboard(s, i, "en", EN_Y));
    w.appendChild(artboard(s, i, "hi", HI_Y, true));
    w.appendChild(artboard(s, i, "ta", TA_Y, true));
  });

  // before / after comparison pair (own clear area, shown only on that stage)
  buildBeforeAfter(w);
  // a main component to "Go to component" into
  buildComponents(w);
}

function buildComponents(w) {
  const el = document.createElement("div");
  el.id = "components";
  el.className = "hidden";
  el.style.left = COMP_X + "px";
  el.style.top = COMP_Y + "px";
  el.innerHTML = `
    <div class="comp-name">◇ Button / Primary</div>
    <span class="picked-tag">Main component · selected</span>
    <div class="comp-frame">
      <div class="cf-label">Default</div>
      <div class="comp-btn">Place Order</div>
      <div class="cf-label">Secondary</div>
      <div class="comp-btn ghost">Add to Cart</div>
    </div>`;
  w.appendChild(el);
}

function sectionEl(id, y, pillText, lastX) {
  const sec = document.createElement("div");
  sec.id = id;
  sec.style.left = "-36px";
  sec.style.top = y - 14 + "px";
  sec.style.width = lastX + 72 + "px";
  sec.style.height = "552px";
  sec.innerHTML = `<div class="sec-title">Localized&nbsp;&nbsp;<span class="sec-pill">${pillText}</span></div>`;
  return sec;
}

function buildBeforeAfter(w) {
  const wrap = document.createElement("div");
  wrap.id = "beforeafter";
  wrap.className = "hidden";
  wrap.style.left = frameX(1) + "px";
  wrap.style.top = BA_Y + "px";
  const before = `<div class="ba-col"><div class="ba-tag bad">Before · CTA clipped</div>
    <div class="phone"><div class="screen indic">${statusbar()}${checkoutHTML("hi")}</div></div></div>`;
  const after = `<div class="ba-col"><div class="ba-tag good">After · hugs label</div>
    <div class="phone"><div class="screen indic">${statusbar()}${checkoutFixedHTML("hi")}</div></div></div>`;
  wrap.innerHTML = before + after;
  w.appendChild(wrap);
}

function artboard(screen, i, lang, y, hidden = false) {
  const el = document.createElement("div");
  el.className = "artboard" + (hidden ? " hidden" : "");
  el.id = `ab-${lang}-${screen.id}`;
  el.style.left = frameX(i) + "px";
  el.style.top = y + "px";
  const label = lang === "en" ? screen.name : `${screen.name} · ${LANG_LABEL[lang]}`;
  el.innerHTML = `<div class="ab-name"><span class="ab-dot"></span>${label}</div>${phoneHTML(screen, lang)}
    <span class="handle tl"></span><span class="handle tr"></span><span class="handle bl"></span><span class="handle br"></span>`;
  return el;
}

/* ---- Camera ------------------------------------------------------------- */
let camAnim = true;
function focus(cx, cy, scale, animate = true) {
  const c = canvasEl();
  const vw = c.clientWidth, vh = c.clientHeight;
  const tx = vw / 2 - cx * scale;
  const ty = vh / 2 - cy * scale;
  const w = world();
  w.style.transition = animate && camAnim ? "transform 900ms cubic-bezier(.4,0,.2,1)" : "none";
  w.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  zoomEl().textContent = Math.round(scale * 100) + "%";
}

// Cinematic camera move — custom duration + easing per shot (used by the film cut).
function cineFocus(cx, cy, scale, ms = 1200, ease = "cubic-bezier(.45,0,.12,1)") {
  const c = canvasEl();
  const tx = c.clientWidth / 2 - cx * scale;
  const ty = c.clientHeight / 2 - cy * scale;
  const w = world();
  w.style.transition = `transform ${ms}ms ${ease}`;
  w.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  zoomEl().textContent = Math.round(scale * 100) + "%";
}
function filmFade() {
  let f = document.getElementById("film-fade");
  if (!f) { f = document.createElement("div"); f.id = "film-fade"; document.body.appendChild(f); }
  setTimeout(() => f.classList.add("on"), 20);
}
// Subtle caption. c1 may contain HTML (e.g. animated numbers). isTitle = the opening card.
function caption(c1, c2, isTitle) {
  let el = document.getElementById("film-cap");
  if (!el) { el = document.createElement("div"); el.id = "film-cap"; document.body.appendChild(el); }
  el.className = isTitle ? "title" : "";
  el.innerHTML = `<div class="cap-inner"><div class="c1">${c1}</div>${c2 ? `<div class="c2">${c2}</div>` : ""}</div>`;
  setTimeout(() => el.classList.add("on"), 20);
}
function captionOut() { document.getElementById("film-cap")?.classList.remove("on"); }
// A soft scan sweep across the frames — invisible tooling made visible for a moment.
async function scanSweep() {
  const c = canvasEl();
  let s = document.getElementById("scan");
  if (!s) { s = document.createElement("div"); s.id = "scan"; c.appendChild(s); }
  s.style.transition = "none"; s.style.left = "-170px"; s.style.opacity = "0";
  await wait(30);
  s.style.transition = "left 1500ms cubic-bezier(.4,0,.2,1), opacity 400ms ease";
  s.style.opacity = "1"; s.style.left = c.clientWidth + "px";
  setTimeout(() => (s.style.opacity = "0"), 1200);
}
// Overflow "under pressure": the fixed button briefly lets the label push out, then clamps back.
async function strainOverflow(el) {
  el.style.transition = "width 240ms cubic-bezier(.4,0,.2,1)";
  el.style.width = "152px"; // tries to fit its translated label…
  await wait(250);
  el.style.width = ""; // …but the fixed width wins → the text clips.
  await wait(220);
}
function appendBadge(lang, sid, findings) {
  const ph = document.getElementById(`ab-${lang}-${sid}`);
  if (!ph) return;
  const types = [...new Set(findings.map((f) => f.type))];
  const b = document.createElement("div");
  b.className = "ab-badge pop";
  b.innerHTML = `<span class="dots">${types.map((t) => `<span class="d" style="background:${TYPE_COLOR[t]}"></span>`).join("")}</span><span>${findings.length}</span>`;
  ph.appendChild(b);
}
// Pressure signature: put the localized layouts "under load" during evaluation, relax after fix.
function pressureOn(lang = "hi") { DATA.screens.forEach((s) => document.getElementById(`ab-${lang}-${s.id}`)?.classList.add("under-pressure")); }
function pressureOff(lang = "hi") { DATA.screens.forEach((s) => document.getElementById(`ab-${lang}-${s.id}`)?.classList.remove("under-pressure")); }
function relaxLayouts(lang = "hi") {
  DATA.screens.forEach((s) => {
    const a = document.getElementById(`ab-${lang}-${s.id}`);
    if (!a) return;
    a.classList.remove("under-pressure");
    a.classList.add("relaxed");
    setTimeout(() => a.classList.remove("relaxed"), 760);
  });
}
// Issue markers appear progressively, one screen at a time (not all at once).
async function revealBadgesProgressive(map, lang = "hi") {
  clearBadges();
  for (const s of DATA.screens) {
    const f = map[s.id] || [];
    if (!f.length) continue;
    appendBadge(lang, s.id, f);
    await wait(130);
  }
}

// camera framings per stage
const OVERVIEW_EN = () => focus((frameX(5) + PHONE_W) / 2, 250, 0.52);
const OVERVIEW_HI = () => focus((frameX(5) + PHONE_W) / 2, HI_Y + 250, 0.52);
const PREVIEW_CAM = () => focus(frameX(1) + PHONE_W / 2, (250 + HI_Y + 260) / 2, 0.62);
const REVEAL_CAM = () => focus(frameX(3) + PHONE_W / 2, HI_Y + 452, 1.75);
const EXPORT_CAM = () => focus((frameX(5) + PHONE_W) / 2, HI_Y + 210, 0.5);
// bilingual framings (english + hindi + tamil, or the two localized rows)
const TRILINGUAL_CAM = () => focus(frameX(1) + PHONE_W / 2, (EN_Y + TA_Y + 512) / 2, 0.42);
const LOCALIZED_ROWS_CAM = () => focus((frameX(5) + PHONE_W) / 2, (HI_Y + TA_Y + 512) / 2, 0.46);
const EXPORT2_CAM = () => focus((frameX(5) + PHONE_W) / 2, (HI_Y + TA_Y + 512) / 2 - 10, 0.42);
const BEFORE_AFTER_CAM = () => focus(frameX(1) + COL / 2 + PHONE_W / 2, BA_Y + 300, 0.92);
const COMP_CAM = () => focus(COMP_X + 130, COMP_Y + 140, 1.15);
const focusPhone = (lang, i, scale = 0.95) => focus(frameX(i) + PHONE_W / 2, ROW_Y[lang] + 256, scale);

/* ---- Frame decorations (selection, badges, reveal) ---------------------- */
function selectEnglish(on) {
  DATA.screens.forEach((s) => document.getElementById(`ab-en-${s.id}`).classList.toggle("selected", on));
}
function showRow(lang, on) {
  DATA.screens.forEach((s) => document.getElementById(`ab-${lang}-${s.id}`).classList.toggle("hidden", !on));
}
const showHindi = (on) => showRow("hi", on);
const showTamil = (on) => showRow("ta", on);
function clearBadges() {
  document.querySelectorAll(".ab-badge").forEach((b) => b.remove());
}
function paintBadges(map, lang = "hi", append = false) {
  if (!append) clearBadges();
  Object.entries(map).forEach(([sid, findings]) => {
    if (!findings.length) return;
    const ph = document.getElementById(`ab-${lang}-${sid}`);
    if (!ph) return;
    const types = [...new Set(findings.map((f) => f.type))];
    const badge = document.createElement("div");
    badge.className = "ab-badge";
    badge.innerHTML =
      `<span class="dots">${types.map((t) => `<span class="d" style="background:${TYPE_COLOR[t]}"></span>`).join("")}</span>` +
      `<span>${findings.length}</span>`;
    ph.appendChild(badge);
  });
}
function clearReveal() { document.querySelectorAll(".reveal-box,.reveal-tag").forEach((n) => n.remove()); }
function addReveal() {
  clearReveal();
  const ph = document.getElementById("ab-hi-checkout");
  const cta = ph.querySelector('[data-cta="checkout"]');
  const box = document.createElement("div");
  box.className = "reveal-box";
  // position over the CTA (button is 120px wide, centered, near the bottom)
  const r = cta.getBoundingClientRect();
  const pr = ph.querySelector(".phone").getBoundingClientRect();
  box.style.left = cta.offsetLeft - 4 + "px";
  box.style.top = cta.offsetTop - 4 + "px";
  box.style.width = cta.offsetWidth + 8 + "px";
  box.style.height = cta.offsetHeight + 8 + "px";
  const tag = document.createElement("div");
  tag.className = "reveal-tag";
  tag.textContent = "Text Overflow · fixed 120px";
  tag.style.left = cta.offsetLeft - 4 + "px";
  tag.style.top = cta.offsetTop - 34 + "px";
  ph.querySelector(".screen").appendChild(box);
  ph.querySelector(".screen").appendChild(tag);
}
function showSection(on) { document.getElementById("section").classList.toggle("show", on); }
function showSection2(on) { document.getElementById("section2").classList.toggle("show", on); }
function showBeforeAfter(on) { document.getElementById("beforeafter").classList.toggle("hidden", !on); }

// Generic on-canvas highlight: a pulsing box (+ optional tag) over element(s) inside a phone.
function clearHighlights() { document.querySelectorAll(".hl-box,.hl-tag,.reveal-box,.reveal-tag").forEach((n) => n.remove()); }
function highlight(phoneEl, targetEl, { color = "var(--t-overflow)", label = "", below = false } = {}) {
  const screen = phoneEl.querySelector(".screen");
  const box = document.createElement("div");
  box.className = "hl-box";
  box.style.setProperty("--c", color);
  box.style.left = targetEl.offsetLeft - 4 + "px";
  box.style.top = targetEl.offsetTop - 4 + "px";
  box.style.width = targetEl.offsetWidth + 8 + "px";
  box.style.height = targetEl.offsetHeight + 8 + "px";
  screen.appendChild(box);
  if (label) {
    const tag = document.createElement("div");
    tag.className = "hl-tag";
    tag.style.setProperty("--c", color);
    tag.textContent = label;
    tag.style.left = targetEl.offsetLeft - 4 + "px";
    tag.style.top = (below ? targetEl.offsetTop + targetEl.offsetHeight + 6 : targetEl.offsetTop - 28) + "px";
    screen.appendChild(tag);
  }
}
function highlightAll(lang, screenId, selector, opts) {
  const ph = document.getElementById(`ab-${lang}-${screenId}`);
  ph.querySelectorAll(selector).forEach((t, i) => highlight(ph, t, i === 0 ? opts : { ...opts, label: "" }));
}
function showComponents(on) { document.getElementById("components").classList.toggle("hidden", !on); }
function pickComponent(on) { document.getElementById("components").classList.toggle("picked", on); }

// ── Delta Engine overlays (measurement lines, growth, baselines, pressure) ──
function clearDeltas() { document.querySelectorAll(".measure,.grow,.baseline,.pressure,.reco").forEach((n) => n.remove()); }
const phone = (lang, id) => document.getElementById(`ab-${lang}-${id}`);
const elIn = (lang, id, sel) => phone(lang, id)?.querySelector(sel);
function overlayHost(phoneEl) { return phoneEl.querySelector(".screen"); }

function measureWidth(phoneEl, targetEl, label, { below = true } = {}) {
  const m = document.createElement("div");
  m.className = "measure draw";
  m.style.left = targetEl.offsetLeft + "px";
  m.style.width = targetEl.offsetWidth + "px";
  m.style.top = targetEl.offsetTop + (below ? targetEl.offsetHeight + 5 : -16) + "px";
  m.innerHTML = `<div class="bar"></div><div class="lbl">${label}</div>`;
  overlayHost(phoneEl).appendChild(m);
}
function growthArrow(phoneEl, targetEl, label, height = 30) {
  const g = document.createElement("div");
  g.className = "grow draw";
  g.style.left = targetEl.offsetLeft + targetEl.offsetWidth + 6 + "px";
  g.style.top = targetEl.offsetTop + targetEl.offsetHeight - height + "px";
  g.style.height = height + "px";
  g.innerHTML = `<div class="stem"></div><div class="head"></div><div class="lbl">${label}</div>`;
  overlayHost(phoneEl).appendChild(g);
}
function baselineOutline(phoneEl, targetEl, label, shrink = 18) {
  const b = document.createElement("div");
  b.className = "baseline";
  b.style.left = targetEl.offsetLeft - 3 + "px";
  b.style.top = targetEl.offsetTop - 3 + "px";
  b.style.width = Math.max(20, targetEl.offsetWidth - shrink) + 6 + "px";
  b.style.height = targetEl.offsetHeight + 6 + "px";
  if (label) b.innerHTML = `<span class="lbl">${label}</span>`;
  overlayHost(phoneEl).appendChild(b);
}
function pressureBadge(phoneEl, targetEl, text, color = "var(--t-overflow)", { corner = "tr" } = {}) {
  const p = document.createElement("div");
  p.className = "pressure pop";
  p.textContent = text;
  p.style.setProperty("--c", color);
  p.style.left = (corner.includes("r") ? targetEl.offsetLeft + targetEl.offsetWidth - 14 : targetEl.offsetLeft - 6) + "px";
  p.style.top = targetEl.offsetTop - 9 + "px";
  overlayHost(phoneEl).appendChild(p);
}
// Recommendation chip on the canvas, just below the frame (CTAs sit near the phone's bottom edge).
function recoChip(artboardEl, text) {
  const pb = artboardEl.querySelector(".phone");
  const c = document.createElement("div");
  c.className = "reco pop";
  c.textContent = text;
  c.style.left = pb.offsetLeft + "px";
  c.style.top = pb.offsetTop + pb.offsetHeight + 12 + "px";
  artboardEl.appendChild(c);
}

/* ---- Plugin views ------------------------------------------------------- */
function tick(on) {
  const c = on ? "var(--brand)" : "none";
  const stroke = on ? "#fff" : "currentColor";
  return on
    ? `<svg class="tick" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="15" height="15" rx="4" fill="${c}"/><path d="M5 9.2l2.6 2.6L13 5.6" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg class="tick" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="1.5" width="15" height="15" rx="4" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/></svg>`;
}
function radio(on) {
  return on
    ? `<svg class="tick" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.25" stroke="var(--brand)" stroke-width="1.5"/><circle cx="9" cy="9" r="3.5" fill="var(--brand)"/></svg>`
    : `<svg class="tick" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.25" stroke="currentColor" stroke-opacity="0.35" stroke-width="1.5"/></svg>`;
}
function head() {
  return `<div class="pg-head"><span class="pg-mark">◈</span><span class="pg-title">Lipi</span><span class="pg-x">✕</span></div>`;
}
function setPlugin(bodyHTML) {
  pluginEl().innerHTML = head() + `<div class="pg-body"><div class="pg-anim">${bodyHTML}</div></div>`;
}

function generateView(highlight) {
  setPlugin(`
    <div class="pv-title">Lipi</div>
    <div class="pv-sub">Generate localized versions of your screens and discover layout issues before shipping.</div>
    <div class="pv-label">Choose Languages</div>
    <div class="opt on">${tick(true)} हिन्दी</div>
    <div class="opt">${tick(false)} தமிழ்</div>
    <div class="field-gap"></div>
    <div class="pv-label">Translation</div>
    <div class="opt on">${radio(true)} Demo Dictionary <span class="soon">no key</span></div>
    <div class="opt">${radio(false)} Google Translate <span class="soon">API key</span></div>
    <div class="field-gap"></div>
    <button class="btn primary ${highlight ? "pulse" : ""}">Generate &amp; Test</button>
    <div class="pv-hint">Select your English frames first.</div>
  `);
}

// First-run onboarding.
function onboardingView() {
  const step = (n, t, d) => `<div style="display:flex;gap:12px;margin-bottom:16px"><span style="width:22px;height:22px;border-radius:50%;background:var(--accent-soft);color:var(--accent-ink);display:grid;place-items:center;font-size:11px;font-weight:700;flex:0 0 auto">${n}</span><span><div style="font-size:12.5px;font-weight:600">${t}</div><div style="font-size:11.5px;color:var(--muted);margin-top:1px;line-height:1.4">${d}</div></span></div>`;
  setPlugin(`
    <div class="pv-title">Welcome to Lipi</div>
    <div class="pv-sub">Pressure-test your English UI against Indian languages — right inside Figma.</div>
    <div style="height:6px"></div>
    ${step(1, "Select your English frames", "Pick the screens you want to test on the canvas.")}
    ${step(2, "Generate & Test", "Lipi clones and localizes them, then measures the layout.")}
    ${step(3, "Fix the root causes", "Reveal issues on canvas and fix once across every screen.")}
    <button class="btn primary block">Get started</button>
  `);
}
// Generate view with the API-key provider selected (key required).
function generateViewKey() {
  setPlugin(`
    <div class="pv-title">Lipi</div>
    <div class="pv-sub">Generate localized versions of your screens and discover layout issues before shipping.</div>
    <div class="pv-label">Choose Languages</div>
    <div class="opt on">${tick(true)} हिन्दी</div>
    <div class="opt">${tick(false)} தமிழ்</div>
    <div class="field-gap"></div>
    <div class="pv-label">Translation</div>
    <div class="opt">${radio(false)} Demo Dictionary <span class="soon">no key</span></div>
    <div class="opt on">${radio(true)} Google Translate <span class="soon">API key</span></div>
    <input placeholder="Paste Google Translation API key" style="width:100%;font-size:12px;padding:10px 11px;border:1px solid var(--line-strong);border-radius:8px;background:#fff;color:inherit;margin-top:10px" />
    <button class="btn primary block" style="margin-top:12px">Generate &amp; Test</button>
  `);
}
// No frames selected — the empty/error state.
function generateViewError() {
  setPlugin(`
    <div class="pv-title">Lipi</div>
    <div class="pv-sub">Generate localized versions of your screens and discover layout issues before shipping.</div>
    <div class="pv-label">Choose Languages</div>
    <div class="opt on">${tick(true)} हिन्दी</div>
    <div class="opt">${tick(false)} தமிழ்</div>
    <div style="display:flex;gap:10px;background:var(--food-soft);border-radius:10px;padding:11px 12px;margin:14px 0">
      <span style="width:22px;height:22px;border-radius:50%;background:var(--danger);color:#fff;display:grid;place-items:center;font-weight:700;font-size:12px;flex:0 0 auto">!</span>
      <span><div style="font-size:12px;font-weight:600">No frames selected</div><div style="font-size:11px;color:var(--muted);margin-top:1px;line-height:1.4">Select your English frames on the canvas, then Generate &amp; Test.</div></span>
    </div>
    <button class="btn primary block" style="opacity:.5">Generate &amp; Test</button>
  `);
}
// Analysis complete, but nothing to fix — the success/empty state.
function noIssuesView() {
  setPlugin(`
    <div class="res-head"><div class="res-title">Analysis complete</div><div class="res-meta">हिन्दी · 6 screens</div>
      <div class="res-actions"><span class="mini tonal">Re-check</span><span class="mini ghost">Export</span><span class="mini ghost">New</span></div></div>
    <div style="text-align:center;padding:30px 8px 8px">
      <div style="width:50px;height:50px;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center;font-size:24px;margin:0 auto 14px">✓</div>
      <div style="font-size:15px;font-weight:600">No issues found</div>
      <div style="font-size:12px;color:var(--muted);margin:5px auto 0;line-height:1.5;max-width:236px">Every screen fits comfortably in हिन्दी. You’re ready to hand off.</div>
      <button class="btn primary" style="width:auto;margin-top:18px;padding:10px 18px">Export Localized Screens</button>
    </div>
  `);
}

// Preview a screen in a localized state on the canvas — reversible, non-destructive.
function previewView() {
  setPlugin(`
    <div class="pv-title">Preview</div>
    <div class="pv-sub">See a screen in a localized state on your canvas — your original frames stay untouched.</div>
    <div class="pv-label">Screen</div>
    <div class="opt" style="justify-content:space-between"><span>Checkout</span><span class="soon">1 / 6</span></div>
    <div class="pv-label" style="margin-top:12px">Language</div>
    <div class="opt on" style="font-family:var(--indic)">हिन्दी</div>
    <div class="field-gap"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:16px;margin-top:2px">
      <span style="font-size:14px;font-weight:600">Preview localized</span>
      <span class="pv-switch" style="position:relative;width:46px;height:26px;border-radius:999px;background:#d7dbe4;flex:0 0 auto">
        <span class="pv-knob" style="position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span></span>
    </div>
    <div class="pv-status" style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:12.5px;font-weight:600;color:var(--muted)">
      <span class="pv-dot" style="width:8px;height:8px;border-radius:50%;background:var(--ok)"></span><span class="pv-status-txt">Showing original · English</span></div>
    <div style="font-size:11.5px;color:var(--faint);margin-top:8px;line-height:1.5">Preview only · toggle off to restore the original.</div>
  `);
}

const PROG_STAGES = ["Preparing", "Translating", "Measuring", "Detecting", "Assembling"];
function progressView(pct, activeIdx, opts = {}) {
  const rows = PROG_STAGES.map((s, i) => {
    const cls = i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
    const mk = i < activeIdx ? "✓" : "";
    return `<div class="stage ${cls}"><span class="mk">${mk}</span>${s}…</div>`;
  }).join("");
  setPlugin(`
    <div class="prog-title">${opts.title || "Analyzing 6 screens"}</div>
    <div class="prog-sub">${opts.sub || "हिन्दी · Demo Dictionary"}</div>
    <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
    ${rows}
  `);
  // animate the fill from 0 (setTimeout, so it runs even when the tab is backgrounded)
  const f = pluginEl().querySelector(".prog-fill");
  if (f) { f.style.width = "0%"; setTimeout(() => (f.style.width = pct + "%"), 30); }
}

function screenCardsHTML(map) {
  return DATA.screens
    .filter((s) => (map[s.id] || []).length)
    .map((s) => {
      const f = map[s.id];
      const types = [...new Set(f.map((x) => x.type))];
      return `<div class="scard"><div class="s-top"><span class="s-name">${s.name.replace(/^\d+ · /, "")}</span>
        <span class="s-count"><b>${f.length}</b> finding${f.length === 1 ? "" : "s"}</span><span style="opacity:.4">›</span></div>
        <div class="s-sum">${types
          .map((t) => `<span><span class="dot" style="background:${TYPE_COLOR[t]}"></span>${TYPE_LABEL[t]}</span>`)
          .join("")}</div></div>`;
    })
    .join("");
}

function resultsView(opts = {}) {
  const map = opts.map || DATA.findingsByScreen;
  const total = Object.values(map).reduce((n, a) => n + a.length, 0);
  const banner = opts.banner || "";
  const anchorSub = opts.anchorSub || "Mostly Text Too Small";
  // bilingual: a language tab strip; meta reflects both languages
  const langTabs = opts.langTabs;
  const activeLang = opts.activeLang || "hi";
  const meta = langTabs ? `${langTabs.length} languages · 6 screens each` : `${LANG_LABEL[activeLang]} · 6 screens`;
  const tabsHTML = langTabs
    ? `<div class="lang-tabs">${langTabs
        .map((l) => `<button class="${l === activeLang ? "on" : ""}">${LANG_LABEL[l]}</button>`)
        .join("")}</div>`
    : "";
  setPlugin(`
    <div class="res-head"><div class="res-title">Analysis complete</div>
      <div class="res-meta">${meta}</div>
      <div class="res-actions"><span class="mini tonal">Re-check</span><span class="mini ghost">Preview</span><span class="mini ghost">Export</span><span class="mini ghost">New</span></div>
    </div>
    ${tabsHTML}
    ${banner}
    <div><span class="anchor-num counter">${total}</span><span class="anchor-unit">findings</span>
      <div class="anchor-sub">${anchorSub}</div></div>
    <div class="toggle"><button class="on">Screens</button><button>Design System</button></div>
    ${screenCardsHTML(map)}
  `);
}

function revealView() {
  setPlugin(`
    <div class="back">‹ Back to results</div>
    <div class="rv-kicker"><span class="dot" style="background:${TYPE_COLOR.overflow}"></span>Text Overflow</div>
    <div class="rv-title">Place Order Button</div>
    <div class="rv-layer">Checkout · हिन्दी</div>
    <div class="rv-row"><span class="k">Problem</span><span class="v">Label “अपना ऑर्डर कन्फ़र्म करें” is clipped by a fixed width.</span></div>
    <div class="rv-row"><span class="k">Button width</span><span class="v">Fixed to 120 px</span></div>
    <div class="rv-row"><span class="k">Recommended</span><span class="v">Allow intrinsic sizing (hug contents).</span></div>
    <div class="rv-actions"><span class="mini solid">Reveal on Canvas</span><span class="mini line">See systemic fix</span></div>
  `);
}

function designSystemView(opts = {}) {
  const cards = DATA.rootCauses
    .map((rc, i) => {
      const active = opts.activeIndex === i;
      const fail = opts.failIndex === i;
      return `<div class="dcard">
      <div class="rv-kicker"><span class="dot" style="background:${TYPE_COLOR[rc.type]}"></span>${rc.pattern}</div>
      <div class="d-title">${rc.title}</div>
      <div class="d-desc">${rc.why}</div>
      <div class="d-scope">${rc.scope}</div>
      <div class="d-rec"><b>Recommended</b> · ${rc.rec}</div>
      <div class="d-actions"><span class="linklike">◎ Reveal</span>${
        rc.action
          ? `<span class="linklike" style="color:${active ? "#fff" : "var(--ink)"};${active ? "background:var(--brand);padding:4px 10px;border-radius:7px;" : ""}">${rc.action} →</span>`
          : ""
      }</div>
      ${fail ? `<div class="navfail">Couldn’t open this component — it’s from an external library, so Figma can’t jump to it. Open that library file to edit it.</div>` : ""}
    </div>`;
    })
    .join("");
  setPlugin(`
    <div class="res-head"><div class="res-title">Analysis complete</div>
      <div class="res-meta">हिन्दी · 6 screens</div>
      <div class="res-actions"><span class="mini tonal">Re-check</span><span class="mini ghost">Preview</span><span class="mini ghost">Export</span><span class="mini ghost">New</span></div>
    </div>
    <div><span class="anchor-num">3</span><span class="anchor-unit">systemic fixes</span>
      <div class="anchor-sub">Fix once, improves many screens</div></div>
    <div class="toggle"><button>Screens</button><button class="on">Design System</button></div>
    ${cards}
  `);
}

/* ---- Stage machine ------------------------------------------------------ */
const STAGE_IDS = [
  "01-selection", "02-language-selected", "03-analysis-progress", "04-preview",
  "05-results", "06-reveal", "07-design-system", "08-recheck", "09-export",
  // bilingual (Hindi + Tamil simultaneously) + before/after
  "10-two-languages", "11-bilingual-preview", "12-results-hindi",
  "13-results-tamil", "14-export-bilingual", "15-before-after",
  // depth: group reveals, go-to-component (success + external), re-check on canvas
  "16-reveal-overflow-group", "17-reveal-small-text", "18-go-to-component",
  "19-go-to-component-external", "20-recheck-on-canvas",
  // full parity: the remaining two detection types revealed on screen
  "21-reveal-line-clip", "22-reveal-missing-font",
  // states: onboarding, API key, empty/error, no-issues success
  "23-onboarding", "24-generate-key", "25-no-frames", "26-no-issues",
];

// reset canvas decorations not owned by a stage (keeps single-stage jumps clean)
function resetCanvas() {
  clearHighlights(); clearReveal(); clearBadges(); clearDeltas();
  document.querySelectorAll(".artboard.resolved").forEach((a) => a.classList.remove("resolved"));
  showSection(false); showSection2(false); showBeforeAfter(false);
  showComponents(false); pickComponent(false);
}

// generate view with both languages ticked
function generateViewBilingual(highlight) {
  setPlugin(`
    <div class="pv-title">Lipi</div>
    <div class="pv-sub">Generate localized versions of your screens and discover layout issues before shipping.</div>
    <div class="pv-label">Choose Languages</div>
    <div class="opt on">${tick(true)} हिन्दी</div>
    <div class="opt on">${tick(true)} தமிழ்</div>
    <div class="field-gap"></div>
    <div class="pv-label">Translation</div>
    <div class="opt on">${radio(true)} Demo Dictionary <span class="soon">no key</span></div>
    <div class="opt">${radio(false)} Google Translate <span class="soon">API key</span></div>
    <div class="field-gap"></div>
    <button class="btn primary ${highlight ? "pulse" : ""}">Generate &amp; Test</button>
    <div class="pv-hint">2 languages · 6 frames selected.</div>
  `);
}
function paintBilingualBadges() {
  clearBadges();
  paintBadges(FINDINGS.hi, "hi", true);
  paintBadges(FINDINGS.ta, "ta", true);
}
// Re-check on canvas: green ✓ on fully-resolved screens, red count on those still remaining.
function paintRecheckBadges(before, after) {
  clearBadges();
  DATA.screens.forEach((s) => {
    const had = (before[s.id] || []).length;
    const left = (after[s.id] || []).length;
    if (!had) return;
    const ph = document.getElementById(`ab-hi-${s.id}`);
    if (!ph) return;
    const badge = document.createElement("div");
    if (left === 0) {
      badge.className = "ab-badge ok";
      badge.innerHTML = `<span class="chk">✓</span><span>Fixed</span>`;
    } else {
      const types = [...new Set(after[s.id].map((f) => f.type))];
      badge.className = "ab-badge";
      badge.innerHTML = `<span class="dots">${types.map((t) => `<span class="d" style="background:${TYPE_COLOR[t]}"></span>`).join("")}</span><span>${left}</span>`;
    }
    ph.appendChild(badge);
  });
}
// A reveal detail panel for a group of same-type findings.
function groupRevealView({ type, title, layer, count, note, rec }) {
  setPlugin(`
    <div class="back">‹ Back to results</div>
    <div class="rv-kicker"><span class="dot" style="background:${TYPE_COLOR[type]}"></span>${TYPE_LABEL[type]}</div>
    <div class="rv-title">${title}</div>
    <div class="rv-layer">${layer}</div>
    <div class="rv-row"><span class="k">Flagged</span><span class="v">${count} layers on this screen</span></div>
    <div class="rv-row"><span class="k">Measured</span><span class="v">${note}</span></div>
    <div class="rv-row"><span class="k">Recommended</span><span class="v">${rec}</span></div>
    <div class="rv-actions"><span class="mini solid">Reveal all on Canvas</span><span class="mini line">See systemic fix</span></div>
  `);
}

async function goStage(id) {
  window.DEMO.settled = false;
  clearHighlights(); clearDeltas(); // no stray highlights/measurements across transitions
  // Selection outline belongs only to the "frames selected" stages.
  if (id !== "01-selection" && id !== "02-language-selected") selectEnglish(false);
  switch (id) {
    case "01-selection":
      clearBadges(); clearReveal(); showSection(false); showHindi(false);
      selectEnglish(true); generateView(false); OVERVIEW_EN();
      await wait(1000); break;

    case "02-language-selected":
      selectEnglish(true); showHindi(false); clearBadges();
      generateView(true); OVERVIEW_EN();
      await wait(900); break;

    case "03-analysis-progress": {
      // Measuring: localized copies exist and the Delta Engine is sizing their geometry.
      showHindi(true); showTamil(false); clearBadges();
      progressView(45, 2, { title: "Analyzing 6 screens", sub: "Measuring geometry · हिन्दी" });
      await raf();
      const rAdd = elIn("hi", "restaurant", ".addbtn");
      if (rAdd) measureWidth(phone("hi", "restaurant"), rAdd, "62 → 96px");
      const cCta = elIn("hi", "cart", ".cta");
      if (cCta) { baselineOutline(phone("hi", "cart"), cCta, "", 60); measureWidth(phone("hi", "cart"), cCta, "measuring…", { below: false }); }
      focus(frameX(1) + PHONE_W / 2, HI_Y + 256, 0.6);
      await wait(1200); break;
    }

    case "04-preview": {
      // Aha: the Hindi copy of a fixed-width CTA overruns its bounds — measured & flagged at once.
      showTamil(false); progressView(100, 4);
      showHindi(true); await raf();
      paintBadges(DATA.findingsByScreen, "hi");
      const cta = elIn("hi", "checkout", '[data-cta="checkout"]');
      if (cta) {
        const ph = phone("hi", "checkout");
        baselineOutline(ph, cta, "English fits · 120px", 48);
        highlight(ph, cta, { color: "var(--t-overflow)", label: "Text Overflow", below: false });
        pressureBadge(ph, cta, "+48px");
        recoChip(ph, "Allow intrinsic sizing");
      }
      // English checkout (top) vs its Hindi copy (bottom): the same button, now overflowing.
      focus(frameX(3) + PHONE_W / 2, 610, 0.57);
      await wait(1500); break;
    }

    case "05-results":
      showHindi(true); showTamil(false); clearReveal(); showSection(false);
      paintBadges(DATA.findingsByScreen); resultsView(); OVERVIEW_HI();
      await wait(1000); break;

    case "06-reveal": {
      // Reveal flies in and explains the geometry: baseline vs needed width, then the fix.
      showHindi(true); showTamil(false); paintBadges(DATA.findingsByScreen);
      revealView(); await raf();
      const cta = elIn("hi", "checkout", '[data-cta="checkout"]');
      if (cta) {
        const ph = phone("hi", "checkout");
        baselineOutline(ph, cta, "English 120px", 48);
        highlight(ph, cta, { color: "var(--t-overflow)" });
        pressureBadge(ph, cta, "+48px");
        measureWidth(ph, cta, "needs 168px", { below: false });
      }
      REVEAL_CAM();
      await wait(1300); break;
    }

    case "07-design-system": {
      // One root cause, illuminated across many screens at once.
      showHindi(true); showTamil(false); clearReveal(); paintBadges(DATA.findingsByScreen);
      designSystemView(); await raf();
      highlightAll("hi", "restaurant", ".addbtn", { color: "var(--t-overflow)" });
      const cartCta = elIn("hi", "cart", ".cta");
      if (cartCta) highlight(phone("hi", "cart"), cartCta, { color: "var(--t-overflow)", label: "Same component", below: false });
      const coCta = elIn("hi", "checkout", '[data-cta="checkout"]');
      if (coCta) highlight(phone("hi", "checkout"), coCta, { color: "var(--t-overflow)" });
      focus(frameX(2) + PHONE_W / 2, HI_Y + 256, 0.58);
      await wait(1300); break;
    }

    case "08-recheck":
      showHindi(true); showTamil(false); clearReveal();
      resultsView({
        map: RECHECK.hi,
        anchorSub: "Down from 11 findings",
        banner: `<div class="banner ok"><span class="b-ic">✓</span><div><div class="b-t">7 fixed · 4 remaining</div><div class="b-m">Re-checked the same screens after your fixes.</div></div></div>`,
      });
      OVERVIEW_HI();
      await animateRecheckSteps();
      await wait(700); break;

    case "09-export":
      showHindi(true); showTamil(false); clearReveal(); clearBadges();
      showSection(true); await raf(); EXPORT_CAM();
      setPlugin(`
        <div class="banner ok" style="margin-top:4px"><span class="b-ic">✓</span><div><div class="b-t">Export complete</div><div class="b-m">6 localized screens added to this page as a section.</div></div></div>
        <div class="pv-label" style="margin-top:6px">Exported</div>
        <div class="dcard"><div class="d-title" style="margin-top:0">हिन्दी · FoodDash</div><div class="d-desc">Home, Restaurant, Cart, Checkout, Orders, Profile — localized copies placed beside the originals.</div></div>
        <div class="res-meta" style="margin-top:12px; color:var(--ok); font-weight:600">✓ Ready for review</div>
        <button class="btn block line" style="border:1px solid var(--line-strong);background:#fff;margin-top:10px">New Analysis</button>
      `);
      await wait(1100); break;

    // ── Bilingual: Hindi + Tamil simultaneously ─────────────────────────────
    case "10-two-languages":
      clearBadges(); clearReveal(); showSection(false); showSection2(false); showBeforeAfter(false);
      showHindi(false); showTamil(false); selectEnglish(true);
      generateViewBilingual(true); OVERVIEW_EN();
      await wait(900); break;

    case "11-bilingual-preview":
      showSection(false); showSection2(false); showBeforeAfter(false); clearBadges();
      showHindi(true); showTamil(true); await raf();
      progressView(100, 4, { title: "Analyzing 6 screens · 2 languages", sub: "हिन्दी + தமிழ் · Demo Dictionary" });
      TRILINGUAL_CAM();
      await wait(1100); break;

    case "12-results-hindi":
      showHindi(true); showTamil(true); clearReveal(); showSection(false); showSection2(false);
      paintBilingualBadges();
      resultsView({ langTabs: ["hi", "ta"], activeLang: "hi", map: FINDINGS.hi, anchorSub: "Mostly Text Too Small" });
      LOCALIZED_ROWS_CAM();
      await wait(1000); break;

    case "13-results-tamil":
      showHindi(true); showTamil(true); clearReveal(); showSection(false); showSection2(false);
      paintBilingualBadges();
      resultsView({ langTabs: ["hi", "ta"], activeLang: "ta", map: FINDINGS.ta, anchorSub: "Tamil expands most — 13 findings" });
      LOCALIZED_ROWS_CAM();
      await wait(1000); break;

    case "14-export-bilingual":
      showHindi(true); showTamil(true); clearReveal(); clearBadges(); showBeforeAfter(false);
      showSection(true); showSection2(true); await raf(); EXPORT2_CAM();
      setPlugin(`
        <div class="banner ok" style="margin-top:4px"><span class="b-ic">✓</span><div><div class="b-t">Export complete</div><div class="b-m">12 localized screens added — हिन्दी and தமிழ் — as two sections.</div></div></div>
        <div class="pv-label" style="margin-top:6px">Exported</div>
        <div class="dcard"><div class="d-title" style="margin-top:0">हिन्दी · 6 screens</div><div class="d-desc">Localized copies placed beside the originals.</div></div>
        <div class="dcard"><div class="d-title" style="margin-top:0">தமிழ் · 6 screens</div><div class="d-desc">A second localized section, one row per language.</div></div>
        <button class="btn block line" style="border:1px solid var(--line-strong);background:#fff;margin-top:4px">New Analysis</button>
      `);
      await wait(1100); break;

    // ── Before / after a systemic fix ───────────────────────────────────────
    case "15-before-after":
      clearReveal(); clearBadges(); showSection(false); showSection2(false);
      showHindi(false); showTamil(false); showBeforeAfter(true); await raf();
      revealView();
      // reframe the reveal panel copy toward the fix outcome
      setPlugin(`
        <div class="rv-kicker"><span class="dot" style="background:${TYPE_COLOR.overflow}"></span>FIXED-WIDTH BUTTONS</div>
        <div class="rv-title">Before → After</div>
        <div class="rv-layer">Place Order · हिन्दी</div>
        <div class="rv-row"><span class="k">Before</span><span class="v">Fixed 120 px — “अपना ऑर्डर कन्फ़र्म करें” is clipped.</span></div>
        <div class="rv-row"><span class="k">After</span><span class="v">Hug contents — the full label fits, no clipping.</span></div>
        <div class="rv-row"><span class="k">Impact</span><span class="v">One component change clears the overflow on 6 screens.</span></div>
        <div class="banner ok" style="margin-top:16px"><span class="b-ic">✓</span><div><div class="b-t">7 fixed · 4 remaining</div><div class="b-m">Re-check confirms the overflow is resolved.</div></div></div>
      `);
      BEFORE_AFTER_CAM();
      await wait(1100); break;

    // ── Depth: group reveals highlighting many layers on screen ─────────────
    case "16-reveal-overflow-group":
      showHindi(true); showTamil(false); clearHighlights(); clearBadges();
      showSection(false); showSection2(false); showBeforeAfter(false); showComponents(false);
      groupRevealView({ type: "overflow", title: "“Add to Cart” buttons", layer: "Restaurant · हिन्दी",
        count: 3, note: "Fixed 62 px — Hindi label overruns the button.", rec: "Hug contents so each button fits its label." });
      await raf();
      highlightAll("hi", "restaurant", ".addbtn", { color: "var(--t-overflow)", label: "Overflow · clipped", below: true });
      focusPhone("hi", 1, 0.92);
      await wait(1100); break;

    case "17-reveal-small-text":
      showHindi(true); showTamil(false); clearHighlights(); clearBadges();
      showSection(false); showSection2(false); showBeforeAfter(false); showComponents(false);
      groupRevealView({ type: "small", title: "Category & label text", layer: "Home · हिन्दी",
        count: 6, note: "10–11 px — below the 15 px Devanagari minimum.", rec: "Raise Devanagari text to a 15 px minimum." });
      await raf();
      highlightAll("hi", "home", ".cat span", { color: "var(--t-small)", label: "Text too small · 11px" });
      focusPhone("hi", 0, 0.95);
      await wait(1100); break;

    // ── Go to component (success + external library) ────────────────────────
    case "18-go-to-component":
      resetCanvas(); showHindi(false); showTamil(false);
      showComponents(true); await raf(); pickComponent(true);
      designSystemView({ activeIndex: 0 });
      COMP_CAM();
      await wait(1100); break;

    case "19-go-to-component-external":
      resetCanvas(); showHindi(true); showTamil(false);
      paintBadges(FINDINGS.hi, "hi");
      designSystemView({ failIndex: 0 });
      OVERVIEW_HI();
      await wait(1100); break;

    // ── Re-check marks resolved vs remaining on the canvas ──────────────────
    case "20-recheck-on-canvas":
      resetCanvas(); showHindi(true); showTamil(false);
      paintRecheckBadges(FINDINGS.hi, RECHECK.hi);
      resultsView({
        map: RECHECK.hi, anchorSub: "Down from 11 findings",
        banner: `<div class="banner ok"><span class="b-ic">✓</span><div><div class="b-t">7 fixed · 4 remaining</div><div class="b-m">Green ✓ = resolved on canvas · red = still flagged.</div></div></div>`,
      });
      OVERVIEW_HI();
      await animateCounter(11, 4);
      await wait(700); break;

    // ── Remaining detection types: line-clip + missing-font (full parity) ───
    case "21-reveal-line-clip":
      showHindi(true); showTamil(false); clearHighlights(); clearBadges();
      showSection(false); showSection2(false); showBeforeAfter(false); showComponents(false);
      groupRevealView({ type: "clip", title: "Delivery address", layer: "Checkout · हिन्दी",
        count: 1, note: "Line-height 0.9× clips the stacked vowel marks (ें, गा).", rec: "Loosen line-height to 1.4× for Devanagari." });
      await raf();
      highlightAll("hi", "checkout", ".co-sub.addr", { color: "var(--t-clip)", label: "Clipped lines", below: true });
      focusPhone("hi", 3, 1.0);
      await wait(1100); break;

    case "22-reveal-missing-font":
      showHindi(true); showTamil(false); clearHighlights(); clearBadges();
      showSection(false); showSection2(false); showBeforeAfter(false); showComponents(false);
      groupRevealView({ type: "font", title: "Order tag", layer: "Orders · हिन्दी",
        count: 2, note: "The tag font has no Devanagari glyphs — renders as tofu (▯▯▯).", rec: "Embed a Devanagari-capable font (e.g. Noto Sans)." });
      await raf();
      highlightAll("hi", "orders", ".otag.tofu", { color: "var(--t-font)", label: "Unsupported font", below: true });
      focusPhone("hi", 4, 1.0);
      await wait(1100); break;

    // ── Plugin states (documentation) ───────────────────────────────────────
    case "23-onboarding":
      resetCanvas(); showHindi(false); showTamil(false); selectEnglish(false);
      onboardingView(); OVERVIEW_EN();
      await wait(600); break;

    case "24-generate-key":
      resetCanvas(); showHindi(false); showTamil(false); selectEnglish(true);
      generateViewKey(); OVERVIEW_EN();
      await wait(600); break;

    case "25-no-frames":
      resetCanvas(); showHindi(false); showTamil(false); selectEnglish(false);
      generateViewError(); OVERVIEW_EN();
      await wait(600); break;

    case "26-no-issues":
      resetCanvas(); showHindi(true); showTamil(false); clearBadges();
      noIssuesView(); OVERVIEW_HI();
      await wait(600); break;
  }
  window.DEMO.settled = true;
}

async function animateCounter(from, to) {
  const el = pluginEl().querySelector(".anchor-num");
  if (!el) return;
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    el.textContent = Math.round(from + (to - from) * (i / steps));
    if (i === 7) document.querySelectorAll("#ab-hi-home .ab-badge, #ab-hi-restaurant .ab-badge").forEach((b) => b.classList.add("gone"));
    await wait(45);
  }
  el.textContent = to;
}

// Re-check payoff: count steps down, resolved frames flash green and shed their badge.
function flashResolved(id) {
  const a = document.getElementById(`ab-hi-${id}`);
  if (!a) return;
  a.classList.add("resolved");
  a.querySelector(".ab-badge")?.classList.add("gone");
}
async function animateRecheckSteps() {
  const el = pluginEl().querySelector(".anchor-num");
  paintBadges(FINDINGS.hi, "hi"); // start from the 11-finding state
  const steps = [11, 9, 7, 4];
  for (let i = 0; i < steps.length; i++) {
    if (el) el.textContent = steps[i];
    if (i === 1) flashResolved("home");
    if (i === 2) flashResolved("restaurant");
    await wait(560);
  }
  if (el) el.textContent = "4";
  paintRecheckBadges(FINDINGS.hi, RECHECK.hi); // settle to green ✓ + remaining
}

/* ---- The 30-second portfolio film ─────────────────────────────────────────
   Not a feature walkthrough. An emotional arc: looks fine → translation breaks
   it → the plugin finds a hidden pattern → one fix, many screens → confidence.
   The one line it must leave: "one component was causing failures everywhere." */
async function film() {
  camAnim = true;
  window.DEMO.finished = false;
  resetCanvas(); showHindi(false); showTamil(false); clearBadges();

  // ── Scene 1 · 0–3s — "This is a Figma plugin." English frames, selected. ──
  generateView(false);
  selectEnglish(true); // selection breathes gently (film-mode)
  cineFocus((frameX(4) + PHONE_W) / 2, 250, 0.5, 0); // establish, instant
  caption("Lipi", "Find layout issues before you ship.", true);
  await wait(900);
  cineFocus(frameX(1) + PHONE_W / 2, 250, 0.66, 2600, "cubic-bezier(.4,0,.2,1)"); // slow, confident push
  await wait(1900);
  captionOut();
  await wait(400);

  // ── Scene 2 · 3–7s — Generate → Hindi appears → it breaks. ──
  generateView(true);
  caption("Translating selected screens…");
  await wait(450);
  progressView(80, 1, { title: "Localizing…", sub: "हिन्दी" }); // a flash, not a dwell
  selectEnglish(false);
  showHindi(true); await raf();
  // English checkout (fine) sits directly above its Hindi copy (broken).
  cineFocus(frameX(3) + PHONE_W / 2, 600, 0.6, 1300);
  await wait(900);
  captionOut();
  const coCta = elIn("hi", "checkout", '[data-cta="checkout"]');
  const coPh = phone("hi", "checkout");
  // the layout visibly pushes against its bounds before the warning appears
  if (coCta) await strainOverflow(coCta);
  if (coCta) { highlight(coPh, coCta, { color: "var(--t-overflow)", label: "Text Overflow", below: false }); pressureBadge(coPh, coCta, "+48px"); }
  await wait(1700);

  // ── Scene 3 · 7–12s — Analysis reveals the finding, with the geometry. ──
  caption("Evaluating layouts…");
  resultsView();
  pressureOn(); // the localized layouts go under load — the signature "pressure"
  scanSweep(); // a soft scan passes across the frames
  if (coCta) { baselineOutline(coPh, coCta, "English 120px", 48); measureWidth(coPh, coCta, "needs 168px", { below: false }); recoChip(coPh, "Allow intrinsic sizing"); }
  cineFocus(frameX(3) + PHONE_W / 2, HI_Y + 415, 1.5, 1500); // fly into the failure
  await wait(2300);
  await revealBadgesProgressive(DATA.findingsByScreen, "hi"); // markers appear one screen at a time
  captionOut();
  cineFocus(frameX(0) + PHONE_W / 2, HI_Y + 300, 1.0, 1300); // and a second kind of failure
  highlightAll("hi", "home", ".cat span", { color: "var(--t-small)", label: "Text too small" });
  await wait(1600);

  // ── Scene 4 · 12–19s — HERO: one component, failing across many screens. ──
  clearHighlights(); clearDeltas();
  cineFocus(frameX(2) + PHONE_W / 2, HI_Y + 256, 0.56, 1700, "cubic-bezier(.5,0,.1,1)"); // pull back to the row
  await wait(1300);
  // the same button lights up, screen by screen — the pattern reveals itself
  highlightAll("hi", "restaurant", ".addbtn", { color: "var(--t-overflow)" }); await wait(540);
  { const e = elIn("hi", "cart", ".cta"); if (e) highlight(phone("hi", "cart"), e, { color: "var(--t-overflow)" }); } await wait(540);
  { const e = elIn("hi", "checkout", '[data-cta="checkout"]'); if (e) highlight(phone("hi", "checkout"), e, { color: "var(--t-overflow)", label: "Same component", below: false }); } await wait(600);
  designSystemView(); // …and collapses into one root cause: Fixed-width buttons · 6 screens
  caption('<span class="num">11</span> findings → <span class="num">3</span> root causes');
  await wait(3600); // hero: hold on "Appears in 6 screens"
  captionOut();

  // ── Scene 5 · 19–25s — Fix once → Re-check → momentum. ──
  clearHighlights();
  caption("Fix once — updates every affected screen.");
  relaxLayouts(); // the one fix relaxes the whole system back to equilibrium
  resultsView({ map: RECHECK.hi, anchorSub: "Down from 11 findings", banner: `<div class="banner ok"><span class="b-ic">✓</span><div><div class="b-t">7 fixed · 4 remaining</div><div class="b-m">One component fix — re-checked.</div></div></div>` });
  cineFocus((frameX(5) + PHONE_W) / 2, HI_Y + 256, 0.52, 1300);
  await wait(1500);
  caption("Re-checking…");
  await animateRecheckSteps(); // 11 → 9 → 7 → 4, frames flash green
  caption('<span class="num">11</span> → <span class="num">4</span> issues');
  await wait(1500);
  captionOut();

  // ── Scene 6 · 25–30s — Export → clean localized canvas → hold → fade. ──
  clearBadges(); clearHighlights(); clearDeltas();
  document.querySelectorAll(".artboard.resolved").forEach((a) => a.classList.remove("resolved"));
  showSection(true); await raf();
  setPlugin(`<div class="banner ok" style="margin-top:4px"><span class="b-ic">✓</span><div><div class="b-t">Export complete</div><div class="b-m">6 localized screens · ready for review</div></div></div>`);
  cineFocus((frameX(5) + PHONE_W) / 2, HI_Y + 205, 0.5, 1900, "cubic-bezier(.4,0,.2,1)");
  await wait(2800); // hold on the clean localized canvas
  filmFade();
  await wait(1100);
  window.DEMO.finished = true;
}

/* ---- Boot --------------------------------------------------------------- */
async function boot() {
  DATA = await fetch("fake-data.json").then((r) => r.json());
  FINDINGS = { hi: DATA.findingsByScreen, ta: DATA.findingsTa };
  RECHECK = { hi: DATA.recheckRemaining, ta: DATA.recheckTa };
  buildWorld();
  await raf();
  window.DEMO = {
    initialized: true,
    settled: false,
    finished: false,
    stages: STAGE_IDS,
    stage: (id) => goStage(id),
    film: () => film(),
    cam: (cx, cy, s) => cineFocus(cx, cy, s, 0), // aggressive-crop hook for the poster set
    camTo: (cx, cy, s, ms = 900) => cineFocus(cx, cy, s, ms), // animated camera move for clips
    showLocalized: (on) => showHindi(on), // toggle the localized row on the real canvas (preview ↔ original)
    geo: { COL, PHONE_W, EN_Y, HI_Y, TA_Y, frameX: (i) => frameX(i) },
    // Composition hooks for bespoke concept images: render any screen in any language,
    // and reuse the analysis overlays on arbitrary composed phones.
    render: (lang, screenId) => phoneHTML(DATA.screens.find((s) => s.id === screenId), lang),
    renderFixed: (lang) => `<div class="phone"><div class="screen indic">${statusbar()}${checkoutFixedHTML(lang)}</div></div>`,
    fx: { highlight, measureWidth, pressureBadge, recoChip, baselineOutline },
    // Render a real plugin-panel view and return its inner markup (head + body),
    // so concept compositions can feature the product UI as the actor.
    plugin: (view, opts = {}) => {
      const V = { results: resultsView, reveal: revealView, designSystem: designSystemView, generateBilingual: generateViewBilingual, preview: previewView, generate: generateView, generateKey: generateViewKey, generateError: generateViewError, noIssues: noIssuesView, onboarding: onboardingView };
      (V[view] || resultsView)(opts);
      return pluginEl().innerHTML;
    },
    data: { findings: FINDINGS, recheck: RECHECK, screens: DATA.screens },
    setCameraAnimation: (on) => (camAnim = on),
    async play() {
      camAnim = true;
      window.DEMO.finished = false;
      for (const id of STAGE_IDS) {
        await goStage(id);
        const dwell = id === "05-results" || id === "07-design-system" || id === "12-results-hindi" || id === "15-before-after" ? 2600 : 1600;
        await wait(dwell);
      }
      window.DEMO.finished = true;
    },
  };

  const params = new URLSearchParams(location.search);
  if (params.get("screenshot") === "1") {
    // Capture mode: no decorative entrance animations or camera easing — deterministic
    // final frames only. Playwright drives the stages explicitly.
    document.body.classList.add("shot");
    camAnim = false;
    await goStage("01-selection");
  } else if (params.get("film") === "1") {
    document.body.classList.add("film-mode");
    film();
  } else if (params.get("stage")) {
    await goStage(params.get("stage"));
  } else {
    await goStage("01-selection");
    setTimeout(() => window.DEMO.play(), 1200);
  }
}

boot();
