# Publishing pack

Everything needed to list **Localization Pressure Test** on the Figma Community as a
portfolio piece. Copy is written to be honest about scope (an Indic-language concept),
which reads better than overclaiming.

---

## 1. Pre-flight — run it in Figma once (do this before publishing)

Nothing here has been exercised in the real Figma runtime yet — only `typecheck`,
`build`, and the engine regression scripts. Import the built plugin and run the full
loop on a real multi-screen mobile design, watching for these likely first-run bugs:

- **Fonts:** generation loads a fallback font (Noto Sans Devanagari / Noto Sans Tamil,
  both Google Fonts and normally available in Figma). If the source design uses a
  **missing font**, `loadFontAsync` can throw → "Analysis couldn't complete". Test on
  a file with all fonts present first.
- **Selection:** the plugin analyzes the frames you *select*. Confirm nested frames
  (screens inside a wrapper/section) attribute correctly, not to the wrapper.
- **Preview:** entering preview clone-swaps every selected screen in place; exiting
  must restore originals with zero leftover layers. Verify the reversibility.
- **Export:** exported copies must land in a `Localized — <Language>` section on the
  current page, named `<Screen> (<Language>)`, and be **visible** (not inheriting the
  hidden originals' visibility).
- **Onboarding:** shows once, then never again (persisted in `clientStorage`).

Fix what breaks, then capture the screenshots below from the *working* plugin.

## 2. Screenshot checklist (retina, no desktop clutter)

Capture the Figma window (⌘⇧4 then Space) at these states → `docs/screenshots/`:

| File | State |
|---|---|
| `01-onboarding.png` | First launch — the four-step onboarding |
| `02-language.png` | Language screen, Hindi selected, Generate visible |
| `03-analysis.png` | The "Analyzing localization…" progress |
| `04-results.png` | Results, Screens view, collapsed screen cards |
| `05-screen-group.png` | One screen expanded → problem groups + layers |
| `06-reveal.png` | A Reveal firing — canvas highlight + plugin |
| `07-preview.png` | Preview active — canvas localized, "Preview Active" pill |
| `08-design-system.png` | Design System view — an inspector card |
| `09-why.png` | A Design System card with "Why?" expanded |
| `10-export.png` | Exported `Localized — Hindi` section on canvas |

## 3. Community listing copy

**Name:** Localization Pressure Test

**Tagline (one line):**
See where translated copy breaks your layout — before handoff.

**Description:**
> Localization Pressure Test generates a Hindi or Tamil variant of your selected
> screens and shows exactly where the translated copy breaks the layout — text
> overflow, text that's too small to read, clipped lines, unsupported fonts.
>
> • **Preview** localized screens in place, on your own canvas — fully reversible.
> • **Reveal** each problem directly on the layer.
> • **Fix recurring issues at the source** — problems are grouped into one
>   recommendation with a jump to the component.
> • **Export** the localized copies into a titled section when you're ready.
>
> A concept focused on Indic languages (Hindi + Tamil). Demo mode works offline;
> real translations use a Google Translate API key.

**Tags:** `localization`, `i18n`, `hindi`, `tamil`, `qa`, `handoff`, `layout`,
`accessibility-adjacent` (pick ~6 Figma allows).

**Category:** Design tools / QA.

## 4. Privacy note (required — the plugin makes network calls)

> Localization Pressure Test runs entirely on your machine. In **Demo mode** no data
> leaves Figma. If you choose the **Google Translate** provider, the plain text of the
> layers you analyze is sent to Google's Translation API to be translated, using the
> API key you provide; the key is stored locally via Figma's `clientStorage` and is
> never transmitted anywhere else. No analytics, no tracking, no other network calls.
> (Declared domain: `translation.googleapis.com`.)

Host this note somewhere linkable (GitHub, a gist, a Notion page) and paste the URL
into the Community listing's privacy field.

## 5. Assets still needed

- **Plugin icon** — 128×128 PNG.
- **Cover art** — 1920×960 PNG (Figma Community cover).
- You're a designer — these are quick in Figma; or ask and I'll draft SVGs to export.

## 6. Publish steps (in the Figma app — your account)

1. **Plugins → Development → Import plugin from manifest…** → `manifest.json`
   (if not already imported).
2. Run it once, confirm the pre-flight above passes.
3. **Plugins → Development → Publish…** (or Manage plugins → Publish).
4. Fill in name, tagline, description, tags, icon, cover, screenshots, privacy URL.
5. Choose visibility — **Public** (listed) or **Unlisted** (link-only, good for a
   portfolio you share deliberately). Submit for review.
