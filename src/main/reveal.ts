import type { CheckId } from "../shared/types";
import { CHECK_COLOR } from "../shared/constants";

// Reveal Mode draws temporary overlay rectangles over affected layers.
// Invariants:
//   • Original layers are NEVER mutated — we only create new, locked rectangles.
//   • Only one reveal exists at a time — a new reveal (or exit) removes the previous.
//   • Overlays live in a single, clearly-named, locked group that is trivial to delete.

const GROUP_NAME = "🔍 Reveal Mode — temporary, safe to delete";

// The temporary group. Module-level so it survives across messages.
let revealGroup: GroupNode | null = null;

function pageOf(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;
  while (current && current.type !== "PAGE") current = current.parent;
  return current as PageNode | null;
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return {
    r: ((n >> 16) & 0xff) / 255,
    g: ((n >> 8) & 0xff) / 255,
    b: (n & 0xff) / 255,
  };
}

/** Remove the current overlay group, if any. Safe to call when nothing is shown. */
export function clearReveal(): void {
  if (!revealGroup) return;
  if (!revealGroup.removed) revealGroup.remove();
  revealGroup = null;
}

// Briefly flash the overlays to draw the eye (preview mode only). No-op if the sandbox
// lacks timers or the overlays are cleared mid-pulse.
function pulseOverlays(rects: RectangleNode[], color: RGB): void {
  if (typeof setTimeout === "undefined" || rects.length === 0) return;
  const paint = (opacity: number) => {
    for (const r of rects) if (!r.removed) r.fills = [{ type: "SOLID", color, opacity }];
  };
  let step = 0;
  const tick = () => {
    if (rects.some((r) => r.removed)) return; // reveal was cleared — stop
    paint(step % 2 === 0 ? 0.32 : 0.06);
    step += 1;
    if (step < 6) setTimeout(tick, 160);
    else paint(0.12); // settle back to the resting highlight
  };
  tick();
}

/**
 * Highlight the given nodes with colour-coded overlays for one check group.
 * Returns the number of layers actually highlighted. When `pulse` is true (preview mode)
 * the overlays flash briefly to draw attention.
 */
export async function reveal(checkId: CheckId, nodeIds: string[], pulse = false): Promise<number> {
  clearReveal();
  const nodes = await Promise.all(nodeIds.map((id) => figma.getNodeByIdAsync(id)));

  // Overlays are page-scoped: switch to the page that owns these nodes so the rectangles
  // land on the right page with matching coordinates.
  for (const n of nodes) {
    if (n && !n.removed) {
      const page = pageOf(n);
      if (page && page !== figma.currentPage) await figma.setCurrentPageAsync(page);
      break;
    }
  }

  const color = hexToRgb(CHECK_COLOR[checkId]);
  const overlays: SceneNode[] = [];

  for (const node of nodes) {
    if (!node || node.removed || !("absoluteBoundingBox" in node)) continue;
    const box = node.absoluteBoundingBox;
    if (!box) continue;

    // A page-level rectangle's x/y are absolute coords, matching absoluteBoundingBox.
    const rect = figma.createRectangle();
    rect.x = box.x;
    rect.y = box.y;
    rect.resize(Math.max(box.width, 1), Math.max(box.height, 1));
    rect.fills = [{ type: "SOLID", color, opacity: 0.12 }];
    rect.strokes = [{ type: "SOLID", color }];
    rect.strokeWeight = 2;
    rect.name = `${checkId} overlay`;
    rect.locked = true; // don't let the designer drag the overlay itself
    overlays.push(rect);
  }

  if (overlays.length === 0) return 0;

  const group = figma.group(overlays, figma.currentPage);
  group.name = GROUP_NAME;
  group.locked = true;
  group.expanded = false;
  revealGroup = group;

  figma.viewport.scrollAndZoomIntoView(overlays);
  if (pulse) {
    pulseOverlays(
      overlays.filter((o): o is RectangleNode => o.type === "RECTANGLE"),
      color,
    );
  }
  return overlays.length;
}
