import { OVERFLOW_TOLERANCE_PX } from "../../../shared/constants";
import { type Check, issue } from "./types";

// Horizontal/positional clipping: translated copy expands and gets cut off.
// Two non-mutating signals we can read straight off the canvas:
//   1. The node is in TRUNCATE mode (Figma is actively ellipsizing it).
//   2. The node's bounds spill outside a parent that clips its content.
export const overflowCheck: Check = (snap, scripts) => {
  // Layout context drives the suggested fix: hug-contents vs. allow-growth.
  const fixContext = snap.parentAutoLayout ? "auto-layout" : "fixed-width";

  if (snap.textAutoResize === "TRUNCATE") {
    const found = issue(
      snap,
      scripts,
      "overflow",
      "error",
      "Text is set to truncate — translated copy is likely being cut off with an ellipsis.",
    );
    found.fixContext = fixContext;
    return found;
  }

  if (snap.bbox && snap.parentBbox && snap.parentClips) {
    const right = snap.bbox.x + snap.bbox.width - (snap.parentBbox.x + snap.parentBbox.width);
    const bottom = snap.bbox.y + snap.bbox.height - (snap.parentBbox.y + snap.parentBbox.height);
    const left = snap.parentBbox.x - snap.bbox.x;
    const top = snap.parentBbox.y - snap.bbox.y;
    const overflow = Math.max(right, bottom, left, top);
    if (overflow > OVERFLOW_TOLERANCE_PX) {
      const found = issue(
        snap,
        scripts,
        "overflow",
        "error",
        "Text overflows its clipping container and is partly hidden.",
        `Spills ${Math.round(overflow)}px past a parent that clips content.`,
      );
      found.fixContext = fixContext;
      return found;
    }
  }

  return null;
};
