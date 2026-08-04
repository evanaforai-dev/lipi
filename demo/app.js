/* ============================================================================
   Localization Pressure Test — fake product demo (no Figma, no network).
   A deterministic stage machine drives a fake canvas + plugin. Playwright (or
   autoplay) walks the stages and captures a screenshot after each.
   ========================================================================== */

let DATA = null;
const TYPE_COLOR = { overflow: "#e08542", small: "#7b6bec", clip: "#3e9be9", font: "#e0576b" };
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
const LANG_LABEL = { hi: "हिन्दी", ta: "தமிழ்" };
// before/after comparison pair lives in its own clear area
const BA_Y = 1900;

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
      <b>${T("Home", L)}</b><div class="co-sub">42, MG Road, Indiranagar, Bengaluru 560038</div></div>
    <div class="co-card"><small>${T("Payment Method", L)}</small><b>•••• •••• •••• 4242</b></div>
    <div class="co-card co-sum"><small>${T("Order Summary", L)}</small>
      <div style="height:6px"></div>
      <div class="brow"><span>${T("Subtotal", L)}</span><span>₹340</span></div>
      <div class="brow total"><span>${T("Total", L)}</span><span>₹398</span></div></div>
    <button class="cta fixed" data-cta="checkout">${T("Place Order", L)}</button>
  </div>`;
}

function ordersHTML(L) {
  const cards = DATA.orders
    .map((o) => {
      const done = o.status === "Delivered";
      return `<div class="ocard"><div class="o-top"><div class="o-th">${o.emoji}</div>
        <div style="flex:1"><div class="o-name">${o.name}</div><div class="o-items">${o.items}</div></div>
        <span class="pill ${done ? "done" : "way"}">${T(o.status, L)}</span></div>
        <div class="o-foot"><span class="muted" style="font-size:11px">₹398 · 2 items</span>
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
      <b>${T("Home", L)}</b><div class="co-sub">42, MG Road, Indiranagar, Bengaluru 560038</div></div>
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
  return `<div class="pg-head"><span class="pg-mark">◈</span><span class="pg-title">Localization Pressure Test</span><span class="pg-x">✕</span></div>`;
}
function setPlugin(bodyHTML) {
  pluginEl().innerHTML = head() + `<div class="pg-body"><div class="pg-anim">${bodyHTML}</div></div>`;
}

function generateView(highlight) {
  setPlugin(`
    <div class="pv-title">Localization Pressure Test</div>
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
  const meta = langTabs ? "2 languages · 6 screens each" : `${LANG_LABEL[activeLang]} · 6 screens`;
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

function designSystemView() {
  const cards = DATA.rootCauses
    .map(
      (rc) => `<div class="dcard">
      <div class="rv-kicker"><span class="dot" style="background:${TYPE_COLOR[rc.type]}"></span>${rc.pattern}</div>
      <div class="d-title">${rc.title}</div>
      <div class="d-desc">${rc.why}</div>
      <div class="d-scope">${rc.scope}</div>
      <div class="d-rec"><b>Recommended</b> · ${rc.rec}</div>
      <div class="d-actions"><span class="linklike">◎ Reveal</span>${rc.action ? `<span class="linklike" style="color:var(--ink)">${rc.action} →</span>` : ""}</div>
    </div>`
    )
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
];

// generate view with both languages ticked
function generateViewBilingual(highlight) {
  setPlugin(`
    <div class="pv-title">Localization Pressure Test</div>
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

async function goStage(id) {
  window.DEMO.settled = false;
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

    case "03-analysis-progress":
      selectEnglish(false); showHindi(false);
      progressView(45, 2); OVERVIEW_EN();
      await wait(1100); break;

    case "04-preview":
      selectEnglish(false); progressView(100, 4);
      showHindi(true); await raf(); PREVIEW_CAM();
      await wait(1100); break;

    case "05-results":
      showHindi(true); clearReveal(); showSection(false);
      paintBadges(DATA.findingsByScreen); resultsView(); OVERVIEW_HI();
      await wait(1000); break;

    case "06-reveal":
      showHindi(true); paintBadges(DATA.findingsByScreen);
      revealView(); await raf(); addReveal(); REVEAL_CAM();
      await wait(1100); break;

    case "07-design-system":
      showHindi(true); clearReveal(); paintBadges(DATA.findingsByScreen);
      designSystemView(); OVERVIEW_HI();
      await wait(1000); break;

    case "08-recheck":
      showHindi(true); clearReveal();
      paintBadges(DATA.recheckRemaining);
      resultsView({
        map: DATA.recheckRemaining,
        anchorSub: "Down from 11 findings",
        banner: `<div class="banner ok"><span class="b-ic">✓</span><div><div class="b-t">7 fixed · 4 remaining</div><div class="b-m">Re-checked the same screens after your fixes.</div></div></div>`,
      });
      OVERVIEW_HI();
      await animateCounter(11, 4);
      await wait(700); break;

    case "09-export":
      showHindi(true); clearReveal(); clearBadges();
      showSection(true); await raf(); EXPORT_CAM();
      setPlugin(`
        <div class="banner ok" style="margin-top:4px"><span class="b-ic">✓</span><div><div class="b-t">Export complete</div><div class="b-m">6 localized screens added to this page as a section.</div></div></div>
        <div class="pv-label" style="margin-top:6px">Exported</div>
        <div class="dcard"><div class="d-title" style="margin-top:0">हिन्दी · FoodDash</div><div class="d-desc">Home, Restaurant, Cart, Checkout, Orders, Profile — localized copies placed beside the originals.</div></div>
        <button class="btn block line" style="border:1px solid var(--line-strong);background:#fff;margin-top:4px">New Analysis</button>
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
  }
  window.DEMO.settled = true;
}

async function animateCounter(from, to) {
  const el = pluginEl().querySelector(".anchor-num");
  if (!el) return;
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    el.textContent = Math.round(from + (to - from) * (i / steps));
    // fade a couple of badges away mid-count for effect
    if (i === 7) document.querySelectorAll("#ab-hi-home .ab-badge, #ab-hi-restaurant .ab-badge").forEach((b) => b.classList.add("gone"));
    await wait(45);
  }
  el.textContent = to;
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
    stages: STAGE_IDS,
    stage: (id) => goStage(id),
    setCameraAnimation: (on) => (camAnim = on),
    async play() {
      camAnim = true;
      for (const id of STAGE_IDS) {
        await goStage(id);
        await wait(id === "05-results" || id === "07-design-system" ? 2400 : 1500);
      }
    },
  };

  const params = new URLSearchParams(location.search);
  if (params.get("screenshot") === "1") {
    // Capture mode: no decorative entrance animations or camera easing — deterministic
    // final frames only. Playwright drives the stages explicitly.
    document.body.classList.add("shot");
    camAnim = false;
    await goStage("01-selection");
  } else if (params.get("stage")) {
    await goStage(params.get("stage"));
  } else {
    await goStage("01-selection");
    setTimeout(() => window.DEMO.play(), 1200);
  }
}

boot();
