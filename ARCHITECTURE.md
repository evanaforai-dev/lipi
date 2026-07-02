# Localization Pressure Test — Technical Architecture & Implementation Plan

A Figma plugin that helps designers catch **localization breakage** after UI copy has
been translated into Indian languages (Hindi, Tamil, Bengali, Telugu, Kannada,
Malayalam, Gujarati, Punjabi, Odia, Marathi, Assamese).

> Scope: 2-day MVP. Every decision below favors "ship something useful fast" over
> completeness. Non-goals are listed explicitly so we don't gold-plate.

---

## 1. What problem are we solving?

When English UI is translated into Indic scripts, layouts break in predictable ways:

| Failure mode | Why Indian languages trigger it |
|---|---|
| **Text overflow / truncation** | Hindi/Tamil often run 20–40% longer than English; fixed-width buttons & chips clip. |
| **Vertical clipping** | Devanagari (शिरोरेखा + matras), Tamil, Bengali stack marks above/below the baseline. A line-height tuned for Latin clips the top/bottom marks. |
| **Tofu / missing glyphs** | The layer's font (e.g. a Latin-only display font) has no Indic glyphs → `□□□`. |
| **Illegible small text** | Conjuncts (क्ष, த்ரி) need more pixels than Latin; 10px Devanagari is mush. |
| **Mixed-script runs** | "Login करें" — Latin + Devanagari in one node, often with one font that only covers one script. |

The plugin scans frames, runs these checks, and gives the designer a clickable list of
problems ranked by severity.

**Non-goals (MVP):** no machine translation, no auto-fixing, no pseudo-localization
generation, no per-glyph raster inspection. We analyze what's already on the canvas.

---

## 2. Folder structure

```
localization-pressure-test/
├── manifest.json              # Figma plugin manifest (main + ui entry points)
├── package.json
├── tsconfig.json
├── vite.config.ts             # builds the UI (React) → single inlined HTML
├── vite.main.config.ts        # builds the sandbox code → IIFE code.js
│
├── src/
│   ├── main/                  # ── Runs in the Figma SANDBOX (no DOM, has figma API)
│   │   ├── main.ts            #    entry: message router + lifecycle
│   │   ├── traverse.ts        #    collect TextNodes from selection/page
│   │   ├── figma-helpers.ts   #    select/zoom-to-node, geometry helpers
│   │   └── analysis/
│   │       ├── index.ts       #    runs all checks, builds the report
│   │       ├── script.ts      #    detect script(s) per text run via unicode ranges
│   │       └── checks/
│   │           ├── overflow.ts      # horizontal clip / truncation
│   │           ├── lineHeight.ts    # vertical clip risk for stacked marks
│   │           ├── fontSupport.ts   # missing-font / Latin-font-on-Indic
│   │           └── fontSize.ts      # too-small-for-Indic legibility
│   │
│   ├── ui/                    # ── Runs in an IFRAME (has DOM/React, no figma API)
│   │   ├── index.html
│   │   ├── main.tsx           #    React mount + postMessage bridge
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Toolbar.tsx          # scope selector + "Run" button
│   │   │   ├── IssueList.tsx        # grouped, sortable results
│   │   │   ├── IssueRow.tsx         # one finding, click → select node
│   │   │   └── EmptyState.tsx
│   │   └── hooks/
│   │       └── usePluginBridge.ts   # typed postMessage send/receive
│   │
│   └── shared/                # ── Imported by BOTH sides. Pure TS, no env APIs.
│       ├── messages.ts        #    message contract (UI ⇄ main)
│       ├── types.ts           #    Issue / Report data models
│       └── constants.ts       #    unicode ranges, thresholds, severities
│
└── ARCHITECTURE.md
```

The hard rule: **`src/shared/` must never import `figma` or touch the DOM.** It is the
only code both contexts share, so it stays pure (types + constants + small helpers).

---

## 3. Plugin architecture (the two-context model)

A Figma plugin always runs as **two isolated programs** that cannot call each other
directly — they only exchange messages:

```
┌─────────────────────────────┐         postMessage          ┌──────────────────────────────┐
│  MAIN (sandbox)             │  ◀───────────────────────▶   │  UI (iframe)                 │
│  src/main/main.ts → code.js │                              │  src/ui/* → ui.html          │
│                             │   figma.ui.postMessage(...)   │                              │
│  • has the `figma` API      │   ──────────────────────▶    │  • has DOM + React           │
│  • reads/writes the canvas  │                              │  • renders the report         │
│  • NO DOM, NO React         │   figma.ui.onmessage(...)     │  • NO access to canvas        │
│  • runs the analysis        │   ◀──────────────────────    │  • sends commands             │
└─────────────────────────────┘                              └──────────────────────────────┘
```

Why this split decides everything:
- **All canvas access lives in `main/`.** Reading `node.width`, `fontName`,
  `node.characters`, selecting/zooming — only the sandbox can do this.
- **All rendering lives in `ui/`.** React, lists, buttons — only the iframe can do this.
- The analysis runs in **main**, not the UI, because it needs the live node geometry.
  The UI just displays the resulting `Report` and sends back "select node X".

`manifest.json` wires it up:

```jsonc
{
  "name": "Localization Pressure Test",
  "main": "dist/code.js",     // the sandbox program
  "ui": "dist/ui.html",       // the iframe (HTML with inlined JS/CSS)
  "editorType": ["figma"]
}
```

### Build strategy (Vite, two targets)

The two contexts have incompatible output requirements, so we run two builds:

1. **UI build** (`vite.config.ts`) — normal React build, then `vite-plugin-singlefile`
   inlines all JS/CSS into one `ui.html`. Figma's `ui` field needs a single file.
2. **Main build** (`vite.main.config.ts`) — library mode, **IIFE** format, single file,
   no code-splitting (the sandbox has no module loader). Outputs `code.js`.

`npm run build` runs both; `npm run dev` watches both. This is the only mildly fiddly
part of setup — budgeted explicitly in the plan below.

---

## 4. Communication between Figma and UI

One typed, discriminated-union contract in `src/shared/messages.ts`, imported by both
sides so the compiler keeps them in sync. Every message has a `type` tag.

```
UI ──▶ MAIN                          MAIN ──▶ UI
────────────────────                 ──────────────────────────
RUN_ANALYSIS { scope }               ANALYSIS_STARTED
SELECT_NODE  { nodeId }              ANALYSIS_PROGRESS { done, total }
                                     ANALYSIS_RESULT   { report }
                                     ANALYSIS_ERROR    { message }
```

- `scope`: `"selection"` (analyze selected frames) or `"page"` (whole current page).
- The bridge is wrapped once on each side so components never call `postMessage`
  directly:
  - **main**: `figma.ui.postMessage(msg)` to send; `figma.ui.onmessage = handler` to receive.
  - **ui**: `parent.postMessage({ pluginMessage: msg }, "*")` to send;
    `window.onmessage = (e) => handle(e.data.pluginMessage)` to receive.
- `usePluginBridge.ts` exposes `{ send, onMessage }` with full types — the rest of the
  React tree stays unaware of postMessage plumbing.

Interaction loop:
1. Designer picks scope, clicks **Run** → UI sends `RUN_ANALYSIS`.
2. Main traverses, runs checks, streams `ANALYSIS_PROGRESS`, ends with `ANALYSIS_RESULT`.
3. UI renders grouped issues.
4. Designer clicks a row → UI sends `SELECT_NODE` → main does
   `figma.currentPage.selection = [node]` + `figma.viewport.scrollAndZoomIntoView([node])`.

---

## 5. Data models

In `src/shared/types.ts` — deliberately flat and serializable (everything crosses
postMessage, so **no class instances, no Figma node references** leave the sandbox; we
pass `nodeId` strings).

```ts
type Severity = "error" | "warning" | "info";

type CheckId =
  | "overflow"        // text clipped/truncated horizontally
  | "line-clip"       // stacked marks risk vertical clipping
  | "missing-font"    // font lacks glyphs for the script (tofu risk)
  | "small-indic";    // font size too small for Indic legibility

type ScriptId =
  | "latin" | "devanagari" | "bengali" | "tamil" | "telugu"
  | "kannada" | "malayalam" | "gujarati" | "gurmukhi" | "odia";

interface Issue {
  id: string;              // stable: `${nodeId}:${checkId}`
  checkId: CheckId;
  severity: Severity;
  nodeId: string;          // for SELECT_NODE round-trip
  nodeName: string;        // shown in the list
  scripts: ScriptId[];     // which scripts were detected in the node
  message: string;         // human-readable, e.g. "Text is 38px wider than its frame"
  detail?: string;         // optional measured numbers for the expandable row
}

interface Report {
  scope: "selection" | "page";
  scannedNodes: number;
  issues: Issue[];         // UI groups by checkId and sorts by severity
}
```

`src/shared/constants.ts` holds the tunable knobs (so checks aren't magic-numbered):

```ts
// Unicode block start/end per script — used to detect script of each run.
SCRIPT_RANGES: Record<ScriptId, [number, number][]>

LINE_HEIGHT_MIN_RATIO   // e.g. 1.4 — below this, stacked marks may clip
MIN_INDIC_FONT_SIZE     // e.g. 12 — Indic below this is flagged
OVERFLOW_TOLERANCE_PX   // e.g. 1 — ignore sub-pixel overshoot
```

---

## 6. Analysis pipeline

A straight, linear pass — no async beyond font loading, easy to reason about in 2 days.

```
RUN_ANALYSIS(scope)
   │
   ▼
[1] TRAVERSE        traverse.ts
   • scope = selection → selected nodes; page → currentPage
   • findAll(node => node.type === "TEXT") → TextNode[]
   • skip hidden / locked nodes
   │
   ▼
[2] EXTRACT         per TextNode, read a plain snapshot:
   • characters, width, height
   • fontSize, lineHeight, fontName  (handle "mixed" / figma.mixed)
   • textAutoResize, parent frame bounds, absoluteBoundingBox
   • hasMissingFont flag
   │
   ▼
[3] DETECT SCRIPT   analysis/script.ts
   • classify each char by SCRIPT_RANGES → set of ScriptId for the node
   • most checks only fire when an Indic script is present
   │
   ▼
[4] RUN CHECKS      analysis/checks/*  (each: snapshot → Issue | null)
   • overflow.ts    text box / content wider than container (respect autoresize & clip)
   • lineHeight.ts  lineHeight/fontSize < ratio AND script stacks marks → clip risk
   • fontSupport.ts hasMissingFont, OR Indic chars in a Latin-only font → tofu risk
   • fontSize.ts    Indic present AND fontSize < MIN_INDIC_FONT_SIZE
   │
   ▼
[5] AGGREGATE       analysis/index.ts
   • collect non-null Issues into Report
   • sort: error → warning → info; emit ANALYSIS_RESULT { report }
```

Design choices that keep it MVP-sized:
- **Each check is a pure function** `(snapshot) => Issue | null`. Trivial to add/remove a
  check; trivial to unit-test without Figma.
- **Script detection is range-based**, not a heavy i18n lib — a few unicode blocks cover
  every major Indian script.
- **No English baseline needed.** We measure the *current* translated layout against its
  *own* container, so there's no requirement to store the pre-translation strings. (A
  future version could diff against a saved baseline for true "expansion %".)
- **Font support is heuristic, not pixel-perfect.** True tofu detection isn't exposed by
  the API; `hasMissingFont` + "Indic codepoints in a font whose family is Latin-only"
  catches the common cases. We label these `warning`, not `error`, to set expectations.

---

## 7. Two-day implementation plan

### Day 1 — skeleton + bridge + first real check
| Block | Work | Done when |
|---|---|---|
| AM-1 | Scaffold: `package.json`, `tsconfig`, both Vite configs, `manifest.json` | `npm run build` emits `code.js` + `ui.html` |
| AM-2 | Load empty plugin in Figma; React "hello" renders in the panel | Panel opens, shows UI |
| AM-3 | `shared/messages.ts` + `usePluginBridge` + main router; round-trip a ping | UI button logs a reply from main |
| PM-1 | `traverse.ts` + `[2] EXTRACT`; return `scannedNodes` count to UI | "Run" shows "scanned N text nodes" |
| PM-2 | `script.ts` + `constants.ts` ranges; first check: `overflow.ts` | Overflowing Indic text appears as an Issue |

### Day 2 — remaining checks + UI polish
| Block | Work | Done when |
|---|---|---|
| AM-1 | `lineHeight.ts` + `fontSize.ts` | All three fire on a test frame |
| AM-2 | `fontSupport.ts` (`hasMissingFont` + Latin-font-on-Indic heuristic) | Tofu/missing-font flagged |
| AM-3 | `SELECT_NODE` round-trip: click row → select + zoom | Clicking a finding jumps to the layer |
| PM-1 | UI: group by check, severity badges, empty state, scope toggle | Report is readable & grouped |
| PM-2 | Build a deliberately-broken test frame; tune thresholds; README | Demo runs end-to-end |

**Risk buffer / cut-first list** (drop these before slipping the date): progress
streaming (just show a spinner), `info`-severity checks, page-scope (selection only),
expandable `detail` rows.

---

## 8. Locked decisions (confirmed)
1. **Scope: selection-only.** The plugin analyzes selected frames. `scope` stays in the
   message contract as a single value (`"selection"`) so page-wide can be added later
   without breaking the API. Drops the page-traversal/perf risk from the MVP.
2. **Scripts: start with 3** — Devanagari (Hindi/Marathi), Tamil, Bengali. `script.ts` and
   `SCRIPT_RANGES` are written to make adding the remaining Indic blocks (Telugu, Kannada,
   Malayalam, Gujarati, Gurmukhi, Odia) a one-line range addition each.
3. **Missing-font severity: `warning`.** The tofu heuristic can false-positive, so it
   stays a warning to set expectations. `overflow` and `line-clip` remain `error`-capable.
