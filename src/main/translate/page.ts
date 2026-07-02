import type { Issue } from "../../shared/types";
import type { ScannedScreen } from "../analysis/screens";

// The translated variant is a TEMPORARY, in-place clone — never a saved page. We clone
// the selected frames as siblings (already in the scene graph, so Auto Layout resolves
// geometry), measure, then delete them — leaving the document exactly as it was and never
// calling figma.createPage(). Findings are re-keyed to the ORIGINAL nodes so Reveal /
// Verify / navigation keep working after the clones are gone.

export interface CloneResult {
  frames: SceneNode[];
  cloneToOriginal: Map<string, string>; // clone node id → original node id
}

export function cloneForMeasurement(roots: readonly SceneNode[]): CloneResult {
  const frames: SceneNode[] = [];
  const cloneToOriginal = new Map<string, string>();

  for (const root of roots) {
    const clone = root.clone(); // sibling of the original, in the same parent
    if ("x" in clone && "x" in root) {
      clone.x = root.x; // overlap the original (no layout shift, no visible move)
      clone.y = root.y;
    }
    frames.push(clone);
    cloneToOriginal.set(clone.id, root.id);

    // Structure is identical right after cloning (translation only changes text later),
    // so descendants align 1:1 by traversal order.
    if ("findAll" in root && "findAll" in clone) {
      const originals = root.findAll(() => true);
      const clones = clone.findAll(() => true);
      const n = Math.min(originals.length, clones.length);
      for (let i = 0; i < n; i++) cloneToOriginal.set(clones[i].id, originals[i].id);
    }
  }

  return { frames, cloneToOriginal };
}

export function removeClones(frames: readonly SceneNode[]): void {
  for (const f of frames) if (!f.removed) f.remove();
}

/** Point issues at the ORIGINAL design nodes so downstream navigation survives deletion. */
export function remapIssuesToOriginal(
  issues: Issue[],
  cloneToOriginal: Map<string, string>,
): void {
  for (const issue of issues) {
    const original = cloneToOriginal.get(issue.nodeId);
    if (original) {
      issue.nodeId = original;
      issue.id = `${original}:${issue.checkId}`;
    }
  }
}

/** Re-key the scanned-screen set (clean screens) from clone frame ids to originals. */
export function remapScannedScreens(
  screens: Map<string, ScannedScreen>,
  cloneToOriginal: Map<string, string>,
): Map<string, ScannedScreen> {
  const out = new Map<string, ScannedScreen>();
  for (const [frameId, info] of screens) {
    out.set(cloneToOriginal.get(frameId) ?? frameId, info);
  }
  return out;
}
