import type { Language } from "../shared/translate";
import { LANGUAGE_LABEL } from "../shared/translate";
import { applyTranslations } from "./translate/apply";

// Export is the ONLY permanent operation. It clones + translates the analyzed frames and
// keeps them, wrapped in a titled section on the current page. Originals are untouched.
export async function exportLocalized(
  rootIds: string[],
  translations: Record<string, string>,
  language: Language,
): Promise<number> {
  const originals = rootIds
    .map((id) => figma.getNodeById(id))
    .filter(
      (n): n is SceneNode =>
        !!n && !n.removed && n.type !== "PAGE" && n.type !== "DOCUMENT",
    );
  if (originals.length === 0) return 0;

  // Drop the localized copies below the originals so they don't overlap.
  let minTop = Infinity;
  let maxBottom = -Infinity;
  for (const o of originals) {
    if ("y" in o && "height" in o) {
      minTop = Math.min(minTop, o.y);
      maxBottom = Math.max(maxBottom, o.y + o.height);
    }
  }
  const gap = maxBottom - minTop + 200;

  const clones: SceneNode[] = [];
  for (const o of originals) {
    const clone = o.clone();
    if ("x" in clone && "x" in o) {
      clone.x = o.x;
      clone.y = o.y + gap;
    }
    clones.push(clone);
  }
  await applyTranslations(clones, translations, language);

  const section = figma.createSection();
  section.name = `Localized — ${LANGUAGE_LABEL[language]}`;
  for (const clone of clones) section.appendChild(clone);

  figma.currentPage.selection = [section];
  figma.viewport.scrollAndZoomIntoView([section]);
  return clones.length;
}
