import { MIN_INDIC_FONT_SIZE } from "../../../shared/constants";
import { hasIndicScript } from "../script";
import { type Check, issue } from "./types";

// Indic conjuncts (क्ष, ந்த, ক্ষ) pack more strokes into the same em than Latin, so
// they turn to mush at small sizes that English tolerates. Flag Indic text below the
// legibility floor.
export const fontSizeCheck: Check = (snap, scripts) => {
  if (!hasIndicScript(scripts)) return null;
  if (snap.fontSize >= MIN_INDIC_FONT_SIZE) return null;

  return issue(
    snap,
    scripts,
    "small-indic",
    "warning",
    "Font size may be too small for legible Indic text.",
    `${Math.round(snap.fontSize)}px (recommended ≥ ${MIN_INDIC_FONT_SIZE}px).`,
  );
};
