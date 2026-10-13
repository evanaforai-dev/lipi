import type { Rect } from "../traverse";
import { getScreenInfo } from "../screen";

// Milestone 2: capture only. We record the layout state of every text node twice —
// once in English (baseline) and once after translation reflows (localized) — for the
// SAME cloned nodes. No classification, no scoring, no findings.

export interface LayoutSnapshot {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  absoluteBounds: Rect | null;
  lineEstimate: number; // approx line count (deterministic estimate, no line-count API)
  parentId: string | null;
  frameId: string | null; // top-level frame (the "screen")
  autoResize: TextNode["textAutoResize"];
  layoutSizingHorizontal: "FIXED" | "HUG" | "FILL" | null;
  layoutSizingVertical: "FIXED" | "HUG" | "FILL" | null;
}

export interface FrameSnapshot {
  frameId: string;
  name: string;
  width: number;
  height: number;
  absoluteBounds: Rect | null;
}

export interface Capture {
  nodes: Map<string, LayoutSnapshot>;
  frames: Map<string, FrameSnapshot>;
  siblings: Map<string, string[]>; // parentId → child node ids (for later displacement work)
}

function rectOf(node: BaseNode): Rect | null {
  if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
    const b = node.absoluteBoundingBox;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }
  return null;
}

function firstFontSize(node: TextNode): number {
  return node.fontSize === figma.mixed ? (node.getRangeFontSize(0, 1) as number) : node.fontSize;
}

function lineHeightPx(node: TextNode, fontSize: number): number {
  const lh = node.lineHeight === figma.mixed ? node.getRangeLineHeight(0, 1) : node.lineHeight;
  if (lh === figma.mixed || lh.unit === "AUTO") return fontSize * 1.2;
  return lh.unit === "PIXELS" ? lh.value : fontSize * (lh.value / 100);
}

function lineEstimate(node: TextNode): number {
  const px = lineHeightPx(node, firstFontSize(node));
  return px > 0 ? Math.max(1, Math.round(node.height / px)) : 1;
}

// layoutSizingHorizontal/Vertical throw when the node isn't in an auto-layout context.
function safeSizing(node: TextNode, axis: "H" | "V"): "FIXED" | "HUG" | "FILL" | null {
  try {
    return axis === "H" ? node.layoutSizingHorizontal : node.layoutSizingVertical;
  } catch {
    return null;
  }
}

function collectText(frames: readonly SceneNode[]): TextNode[] {
  return frames.flatMap((f) =>
    f.type === "TEXT"
      ? [f]
      : "findAllWithCriteria" in f
        ? f.findAllWithCriteria({ types: ["TEXT"] })
        : [],
  );
}

/** Deterministic layout snapshot of every text node under the given frames. */
export function captureLayout(frames: readonly SceneNode[]): Capture {
  const nodes = new Map<string, LayoutSnapshot>();
  const frameSnaps = new Map<string, FrameSnapshot>();
  const siblings = new Map<string, string[]>();

  for (const node of collectText(frames)) {
    const screen = getScreenInfo(node);
    const parent = node.parent;

    nodes.set(node.id, {
      nodeId: node.id,
      name: node.name,
      width: node.width,
      height: node.height,
      absoluteBounds: rectOf(node),
      lineEstimate: lineEstimate(node),
      parentId: parent?.id ?? null,
      frameId: screen.frameId ?? null,
      autoResize: node.textAutoResize,
      layoutSizingHorizontal: safeSizing(node, "H"),
      layoutSizingVertical: safeSizing(node, "V"),
    });

    if (screen.frameId && !frameSnaps.has(screen.frameId)) {
      // The screen frame is an ancestor of this text node; walk up rather than look it up.
      let frameNode: BaseNode | null = node.parent;
      while (frameNode && frameNode.id !== screen.frameId) frameNode = frameNode.parent;
      if (frameNode && "width" in frameNode && "height" in frameNode) {
        frameSnaps.set(screen.frameId, {
          frameId: screen.frameId,
          name: frameNode.name,
          width: frameNode.width,
          height: frameNode.height,
          absoluteBounds: rectOf(frameNode),
        });
      }
    }

    if (parent && "children" in parent && !siblings.has(parent.id)) {
      siblings.set(
        parent.id,
        parent.children.map((c) => c.id),
      );
    }
  }

  return { nodes, frames: frameSnaps, siblings };
}

/**
 * Verify node identity is stable between the two captures, and print a concise summary.
 * Because translation happens IN PLACE (setCharacters keeps node ids), every baseline
 * node id must reappear in the localized capture. Mismatches are logged, never ignored.
 */
export function verifyCapture(baseline: Capture, localized: Capture): void {
  let matched = 0;
  const missing: string[] = [];
  const added: string[] = [];

  for (const id of baseline.nodes.keys()) {
    if (localized.nodes.has(id)) matched++;
    else missing.push(id);
  }
  for (const id of localized.nodes.keys()) {
    if (!baseline.nodes.has(id)) added.push(id);
  }

  console.log("============ DELTA CAPTURE ============");
  console.log("Captured baseline: ", baseline.nodes.size, "text nodes");
  console.log("Captured localized:", localized.nodes.size, "text nodes");
  console.log("Matched:", matched);
  console.log("Missing:", missing.length);
  for (const id of missing) console.log(`  MISSING (in baseline, gone in localized): ${id}`);
  console.log("Added:", added.length);
  for (const id of added) console.log(`  ADDED (in localized, absent in baseline): ${id}`);
  console.log("======================================");
}
