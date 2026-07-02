import { LINE_HEIGHT_MIN_RATIO } from "../../../shared/constants";
import { hasIndicScript } from "../script";
import { type Check, issue } from "./types";

// Devanagari (matras + shirorekha), Bengali and Tamil stack marks above and below
// the baseline. A line-height tuned for Latin clips those marks. AUTO line-height
// follows the font's own metrics and is left alone; only explicit tight values flag.
export const lineHeightCheck: Check = (snap, scripts) => {
  if (!hasIndicScript(scripts)) return null;
  if (snap.lineHeight.unit === "AUTO" || snap.fontSize <= 0) return null;

  const ratio =
    snap.lineHeight.unit === "PIXELS"
      ? snap.lineHeight.value / snap.fontSize
      : snap.lineHeight.value / 100;

  if (ratio < LINE_HEIGHT_MIN_RATIO) {
    return issue(
      snap,
      scripts,
      "line-clip",
      "warning",
      "Line height may be too tight for stacked marks in this script — accents could clip.",
      `Ratio ${ratio.toFixed(2)} (recommended ≥ ${LINE_HEIGHT_MIN_RATIO}).`,
    );
  }
  return null;
};
