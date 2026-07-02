import { hasIndicScript } from "../script";
import { type Check, issue } from "./types";

// Tofu (□□□) risk: the layer's font can't render the script. The API doesn't expose
// per-glyph coverage, so we use the one reliable signal it does give — hasMissingFont —
// and scope the warning to nodes that actually contain Indic text. Warning severity
// per the locked decision: the signal is heuristic and can false-positive.
export const fontSupportCheck: Check = (snap, scripts) => {
  if (!snap.hasMissingFont) return null;
  if (!hasIndicScript(scripts)) return null;

  return issue(
    snap,
    scripts,
    "missing-font",
    "warning",
    "Font is missing or unavailable for this Indic text — it may render as tofu (□□□).",
    `Font: ${snap.fontFamily} ${snap.fontStyle}.`,
  );
};
