# Publishing pack

Everything needed to list **Lipi** on the Figma Community as a
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

**Name:** Lipi

**Tagline (one line):**
Pressure-test your UI in Hindi and Tamil before you ship.

**Description:**
> Translated copy changes the geometry of a screen. Lipi shows you where, and which
> component is behind it.
>
> Select your English frames, pick Hindi or Tamil, and press Generate & Test. Lipi
> translates the copy for free (no key, no account), re-measures every layer, and flags
> text overflow, text too small to read, clipped lines and unsupported fonts.
>
> • **Preview** localized screens in place on your own canvas. Fully reversible.
> • **Reveal** each problem on the exact layer.
> • **Fix once.** Repeated failures roll up to the component causing them, so one fix
>   clears every screen it appears on. Re-check confirms it.
> • **Export** localized copies into their own section when you are ready.
>
> Free translation covers about 5,000 characters a day. Past that, Lipi uses placeholder
> text in the right script so the test still runs. Offline mode sends nothing anywhere.
> Tamil is in beta. Feedback is welcome from the link in the plugin.

**Tags:** `localization`, `i18n`, `hindi`, `tamil`, `india`, `qa`, `handoff`.

**Category:** Design tools.

## 4. Privacy

Paste the public URL of [`PRIVACY.md`](PRIVACY.md) into the listing's privacy field.

## 5. Assets

All in `docs/store/`, each rendered from the HTML file beside it:

- `icon.png`: 128×128. White लि inside a dashed boundary with a grey पि spilling past it:
  localized text overflowing its container, in black and white.
- `slides/thumbnail.png`: 1920×1080 listing thumbnail.
- `slides/1-meet.png` to `slides/9-free.png`: the nine carousel images, in order.

## 6. Publish steps (in the Figma app — your account)

1. **Plugins → Development → Import plugin from manifest…** → `manifest.json`
   (if not already imported).
2. Run it once, confirm the pre-flight above passes.
3. **Plugins → Development → Publish…** (or Manage plugins → Publish).
4. Fill in name, tagline, description, tags, icon, cover, screenshots, privacy URL.
5. Choose visibility — **Public** (listed) or **Unlisted** (link-only, good for a
   portfolio you share deliberately). Submit for review.
