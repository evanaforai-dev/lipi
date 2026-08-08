# Localization Pressure Test — Demo Walkthrough

A **completely self-contained, fake product demonstration** of the Localization
Pressure Test plugin. No Figma, no APIs, no network — everything is simulated in
HTML/CSS/JS and captured with Playwright into presentation-ready screenshots.

It recreates:

- a **fake design-tool desktop** (canvas + a 320px plugin panel on the right),
- a **fake food-delivery app** (Home, Restaurant, Cart, Checkout, Orders, Profile),
- **English → Indic** localized copies on the canvas,
- the plugin's full flow: generate → progress → preview → results → reveal →
  design-system fixes → re-check → export,
- and **automatic screenshot capture** of all nine stages.

## Generate all screenshots (single command)

```bash
npm install && npm run demo
```

`npm run demo` installs the Chromium binary Playwright needs, then walks the demo
through every stage and writes nine crisp **2560 × 1600** PNGs to:

```
demo/screenshots/
  # Single-language (Hindi) walkthrough
  01-selection.png          English screens selected, plugin idle
  02-language-selected.png  Hindi chosen, Generate highlighted
  03-analysis-progress.png  Animated stages, progress ~45%
  04-preview.png            Localized Hindi copies appear on canvas
  05-results.png            Analysis complete · 11 findings, issue cards
  06-reveal.png             Zoom to an overflowing Hindi CTA
  07-design-system.png      Root-cause systemic fixes (Screens ↔ Design System)
  08-recheck.png            11 → 4, "7 fixed · 4 remaining"
  09-export.png             Exported हिन्दी section, "Export complete"
  # Bilingual (Hindi + Tamil simultaneously) + before/after
  10-two-languages.png      Both हिन्दी + தமிழ் selected, Generate highlighted
  11-bilingual-preview.png  English → Hindi → Tamil, three rows on canvas
  12-results-hindi.png      Bilingual results, language tabs, Hindi active (11)
  13-results-tamil.png      Tamil tab active (13 — "Tamil expands most")
  14-export-bilingual.png   Two localized sections, "12 localized screens"
  15-before-after.png       Clipped CTA → hugged CTA, "7 fixed · 4 remaining"
  # Depth — reveals, go-to-component, on-canvas re-check
  16-reveal-overflow-group.png    Group reveal: 3 clipped "Add to Cart" buttons
  17-reveal-small-text.png        Group reveal: 6 sub-15px Devanagari labels
  18-go-to-component.png          Jumps to + selects the main component
  19-go-to-component-external.png Red feedback: component from an external library
  20-recheck-on-canvas.png        Green ✓ resolved · red still flagged, on canvas
  21-reveal-line-clip.png         Reveal: tight line-height clips Devanagari marks
  22-reveal-missing-font.png      Reveal: tag font lacks glyphs → tofu (▯▯▯)
```

All four detection types — overflow (16), text-too-small (17), clipped-lines (21),
and missing-font (22) — are revealed on the actual screens, not just listed.

`npm run demo` also builds two extra deliverables:

- **`contact-sheet.png`** — all 15 stills on one page (source: `gallery.html`).
- **`demo-film.mp4`** / **`.webm`** — a **~30s portfolio film** (`npm run film`).
  A directed, cinematic cut with an emotional arc — looks fine → translation
  breaks it → the plugin finds a hidden pattern → one fix, many screens →
  confidence. Built to leave one idea: *"one component was causing localization
  failures across multiple screens."* Not a feature list.
- **`demo-walkthrough.mp4`** / **`.webm`** — the ~75s complete walkthrough
  (`npm run video`): every stage, all four problem types, bilingual, before/after.
  The MP4s (H.264) play everywhere (QuickTime, Preview, Keynote, PowerPoint) via
  the bundled `ffmpeg-static`; the WebMs are the raw recordings.

### Two separate outputs

The story and the documentation are **different deliverables** with different
rendering configs:

- **Video = tells the story** (captions ON). `npm run film` → `demo-film.mp4`
  keeps all cinematic typography, hero statements, timing and the pressure
  animation. `npm run video` → `demo-walkthrough.mp4` is the longer, comprehensive
  autoplay (no marketing captions).
- **Screenshots = document the product** (captions OFF). Clean UI-only, captured
  as if straight from the real app — no headlines, lower-thirds or cinematic
  overlays. `npm run screenshots` → **26** frames covering every function and
  state (generate, API-key, empty/error, progress, preview, results, all four
  reveal types, design system, go-to-component ± external, re-check, export,
  bilingual, before/after, onboarding, no-issues). `npm run stills` → the clean
  asset frames `cover.png`, `social.png` (1200×630 OG), `thumbnail.png` (16:9),
  `poster.png`. Branding lives inside the product — the plugin panel reads **Lipi**.
- **Posters** (`npm run posters`) are a separate cinematic exploration — dark
  workspace, aggressive crop, keynote titles — kept intentionally typographic.

Design language: a **single accent** (`#3e63f0`) carries every tool signal —
selection, measurements, issue markers, component relationships — while the demo
app keeps its own red brand as *content*, and green means *resolved* only.

**Posters** (a parallel exploration) — `npm run posters` renders launch-poster
compositions into `demo/posters/`: a **dark workspace**, aggressive crop, one
dominant focal point, and negative space carrying a keynote title. The plugin is
the product; Figma is only atmosphere. `01-the-break`, `02-the-pattern`,
`03-the-product`, `04-measured` (2560×1600) + `05-cover-portrait` (2160×2700).

Regenerate individually with `npm run screenshots`, `npm run gallery`, or `npm run video`.
See everything together in a browser: `npm run serve` → <http://localhost:4599/gallery.html>

## Watch it live in a browser (optional)

```bash
npm run serve
```

Then open <http://localhost:4599>. The demo **auto-plays** through every stage —
no interaction needed. Jump to any single stage with a query param, e.g.
`http://localhost:4599/?stage=05-results`.

## Languages

Fully realistic examples: **हिन्दी** and **தமிழ்**.
Believable sample data also included for తెలుగు, ಕನ್ನಡ, മലയാളം, বাংলা, ગુજરાતી, मराठी
(see `fake-data.json`).

## Files

| File | Role |
|------|------|
| `index.html` | Desktop shell (top bar, canvas, plugin panel) |
| `styles.css` | All styling — neutral, mature productivity-app look |
| `app.js` | Screen rendering, camera, the 9-stage machine, plugin views |
| `fake-data.json` | All content: screens, translations, findings, root causes |
| `serve.mjs` | Zero-dependency static server |
| `screenshot.mjs` | Playwright capture (starts the server, walks stages, shoots) |

Everything is **deterministic** — no randomness, no clocks, no external requests —
so the screenshots are identical on every run.
