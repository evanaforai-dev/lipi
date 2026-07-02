import type { Capture } from "./snapshot";

// Milestone 3: geometry only. Compare baseline vs localized captures and emit
// deterministic layout deltas. No classification, no scoring, no findings.
// Nodes are matched STRICTLY by id (never by name or position) — the in-place
// translation guarantees identical ids across captures.

export interface Point {
  x: number;
  y: number;
}

export interface NodeDelta {
  nodeId: string;
  nodeName: string;
  widthBefore: number;
  widthAfter: number;
  widthGrowth: number;
  heightBefore: number;
  heightAfter: number;
  heightGrowth: number;
  lineEstimateBefore: number;
  lineEstimateAfter: number;
  lineGrowth: number;
  positionBefore: Point | null;
  positionAfter: Point | null;
  deltaX: number;
  deltaY: number;
}

export interface FrameDelta {
  frameId: string;
  frameName: string;
  frameWidthGrowth: number;
  frameHeightGrowth: number;
}

export interface DeltaResult {
  nodes: NodeDelta[];
  frames: FrameDelta[];
  siblingsMoved: number; // matched nodes whose position changed
  largestSiblingShift: number; // max positional shift (px)
}

export function computeLayoutDelta(baseline: Capture, localized: Capture): DeltaResult {
  const nodes: NodeDelta[] = [];
  let siblingsMoved = 0;
  let largestSiblingShift = 0;

  for (const [id, b] of baseline.nodes) {
    const l = localized.nodes.get(id); // match by id only
    if (!l) continue; // missing nodes are reported by verifyCapture, not here

    const positionBefore = b.absoluteBounds
      ? { x: b.absoluteBounds.x, y: b.absoluteBounds.y }
      : null;
    const positionAfter = l.absoluteBounds
      ? { x: l.absoluteBounds.x, y: l.absoluteBounds.y }
      : null;
    const deltaX = positionBefore && positionAfter ? positionAfter.x - positionBefore.x : 0;
    const deltaY = positionBefore && positionAfter ? positionAfter.y - positionBefore.y : 0;

    nodes.push({
      nodeId: id,
      nodeName: l.name,
      widthBefore: b.width,
      widthAfter: l.width,
      widthGrowth: l.width - b.width,
      heightBefore: b.height,
      heightAfter: l.height,
      heightGrowth: l.height - b.height,
      lineEstimateBefore: b.lineEstimate,
      lineEstimateAfter: l.lineEstimate,
      lineGrowth: l.lineEstimate - b.lineEstimate,
      positionBefore,
      positionAfter,
      deltaX,
      deltaY,
    });

    const shift = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    if (shift > 0) siblingsMoved++;
    if (shift > largestSiblingShift) largestSiblingShift = shift;
  }

  const frames: FrameDelta[] = [];
  for (const [id, b] of baseline.frames) {
    const l = localized.frames.get(id);
    if (!l) continue;
    frames.push({
      frameId: id,
      frameName: l.name,
      frameWidthGrowth: l.width - b.width,
      frameHeightGrowth: l.height - b.height,
    });
  }

  return { nodes, frames, siblingsMoved, largestSiblingShift };
}

/** Debug summary + the top 10 largest changes. Pure (uses captured names, not figma). */
export function printDelta(result: DeltaResult): void {
  const r = Math.round;
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const widthGrowths = result.nodes.map((d) => d.widthGrowth);
  const heightGrowths = result.nodes.map((d) => d.heightGrowth);
  const largestFrame = result.frames.reduce(
    (m, f) => Math.max(m, f.frameWidthGrowth, f.frameHeightGrowth),
    0,
  );

  console.log("=========== DELTA ===========");
  console.log("Nodes compared:         ", result.nodes.length);
  console.log("Average width growth:   ", r(mean(widthGrowths)));
  console.log("Average height growth:  ", r(mean(heightGrowths)));
  console.log("Largest width increase: ", result.nodes.length ? r(Math.max(...widthGrowths)) : 0);
  console.log("Largest height increase:", result.nodes.length ? r(Math.max(...heightGrowths)) : 0);
  console.log("Largest sibling shift:  ", r(result.largestSiblingShift));
  console.log("Largest frame growth:   ", r(largestFrame));
  console.log("=============================");

  const magnitude = (d: NodeDelta) =>
    Math.max(d.widthGrowth, d.heightGrowth, Math.abs(d.deltaX), Math.abs(d.deltaY));
  const top = [...result.nodes].sort((a, b) => magnitude(b) - magnitude(a)).slice(0, 10);
  for (const d of top) {
    console.log(`\n${d.nodeName}`);
    console.log(`  width  ${r(d.widthBefore)} -> ${r(d.widthAfter)}`);
    console.log(`  height ${r(d.heightBefore)} -> ${r(d.heightAfter)}`);
    console.log(`  lines  ${d.lineEstimateBefore} -> ${d.lineEstimateAfter}`);
    console.log(`  deltaY ${r(d.deltaY)}`);
  }
}
