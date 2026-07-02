import type { Language } from "../../shared/translate";

// Fonts that can render each script — kept as-is. Anything else gets the fallback so the
// translated variant renders legibly (and layout can actually be measured).
const SCRIPT_CAPABLE: Record<Language, Set<string>> = {
  hi: new Set([
    "Noto Sans Devanagari",
    "Noto Serif Devanagari",
    "Mukta",
    "Hind",
    "Poppins",
    "Rozha One",
    "Baloo 2",
    "Tiro Devanagari Hindi",
    "Kohinoor Devanagari",
    "Mangal",
  ]),
  ta: new Set([
    "Noto Sans Tamil",
    "Noto Serif Tamil",
    "Mukta Malar",
    "Hind Madurai",
    "Catamaran",
    "Baloo Thambi 2",
    "Tiro Tamil",
    "Latha",
  ]),
};

const FALLBACK_FONT: Record<Language, FontName> = {
  hi: { family: "Noto Sans Devanagari", style: "Regular" },
  ta: { family: "Noto Sans Tamil", style: "Regular" },
};

const SCRIPT_RANGE: Record<Language, [number, number]> = {
  hi: [0x0900, 0x097f],
  ta: [0x0b80, 0x0bff],
};

function firstFontName(node: TextNode): FontName {
  const f = node.fontName;
  return f === figma.mixed ? (node.getRangeFontName(0, 1) as FontName) : f;
}

function containsScript(text: string, [lo, hi]: [number, number]): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if (c !== undefined && c >= lo && c <= hi) return true;
  }
  return false;
}

/**
 * Stage 4 — load fonts, then replace each duplicate node's text with its translation
 * (falling back to English if untranslated). Setting characters reflows Auto Layout
 * synchronously, so geometry is settled the instant this returns. Returns the count of
 * text nodes touched.
 */
export async function applyTranslations(
  frames: readonly SceneNode[],
  translations: Record<string, string>,
  language: Language,
): Promise<number> {
  const nodes: TextNode[] = frames.flatMap((f) =>
    f.type === "TEXT"
      ? [f]
      : "findAllWithCriteria" in f
        ? f.findAllWithCriteria({ types: ["TEXT"] })
        : [],
  );

  const range = SCRIPT_RANGE[language];
  const capable = SCRIPT_CAPABLE[language];
  const plan: { node: TextNode; text: string; font: FontName }[] = [];
  const fonts = new Map<string, FontName>();

  for (const node of nodes) {
    const src = node.characters;
    const text = translations[src] ?? src; // fallback to English when untranslated
    const current = firstFontName(node);
    const needsFallback = containsScript(text, range) && !capable.has(current.family);
    const font = needsFallback ? FALLBACK_FONT[language] : current;
    plan.push({ node, text, font });
    fonts.set(`${font.family}__${font.style}`, font);
  }

  // Load every font we'll use before touching any characters.
  await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));

  for (const { node, text, font } of plan) {
    node.fontName = font; // unify to one font (also applies the fallback) — variant only
    node.characters = text; // reflows immediately
  }

  return nodes.length;
}
