// Deterministic fixtures for the Delta Engine (geometry only). No Figma, no findings.
import { computeLayoutDelta } from "../src/main/delta/compute";
import type { Capture, LayoutSnapshot, FrameSnapshot } from "../src/main/delta/snapshot";

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} → ${JSON.stringify(actual)}${ok ? "" : ` (want ${JSON.stringify(expected)})`}`);
}

const node = (
  id: string,
  name: string,
  width: number,
  height: number,
  lineEstimate: number,
  x: number,
  y: number,
): LayoutSnapshot => ({
  nodeId: id,
  name,
  width,
  height,
  absoluteBounds: { x, y, width, height },
  lineEstimate,
  parentId: "card",
  frameId: "screen",
  autoResize: "HEIGHT",
  layoutSizingHorizontal: "FIXED",
  layoutSizingVertical: "HUG",
});

const frame = (width: number, height: number): FrameSnapshot => ({
  frameId: "screen",
  width,
  height,
  absoluteBounds: { x: 0, y: 0, width, height },
});

// Button "A" expands (wider, taller, 1→2 lines). Sibling "B" gets pushed down 32px.
// The screen frame grows 32px taller.
const baseline: Capture = {
  nodes: new Map([
    ["a", node("a", "Button Label", 84, 24, 1, 0, 0)],
    ["b", node("b", "Sibling", 100, 20, 1, 0, 30)],
  ]),
  frames: new Map([["screen", frame(375, 200)]]),
  siblings: new Map([["card", ["a", "b"]]]),
};
const localized: Capture = {
  nodes: new Map([
    ["a", node("a", "Button Label", 146, 48, 2, 0, 0)],
    ["b", node("b", "Sibling", 100, 20, 1, 0, 62)],
  ]),
  frames: new Map([["screen", frame(375, 232)]]),
  siblings: new Map([["card", ["a", "b"]]]),
};

const result = computeLayoutDelta(baseline, localized);
const a = result.nodes.find((d) => d.nodeId === "a")!;
const b = result.nodes.find((d) => d.nodeId === "b")!;

expect("nodes compared", result.nodes.length, 2);
expect("A width growth", a.widthGrowth, 62);
expect("A height growth", a.heightGrowth, 24);
expect("A line growth", a.lineGrowth, 1);
expect("A did not move", [a.deltaX, a.deltaY], [0, 0]);
expect("B pushed down (deltaY)", b.deltaY, 32);
expect("B no size change", [b.widthGrowth, b.heightGrowth], [0, 0]);
expect("siblings moved", result.siblingsMoved, 1);
expect("largest sibling shift", result.largestSiblingShift, 32);
expect("frame height growth", result.frames[0].frameHeightGrowth, 32);
expect("frame width growth", result.frames[0].frameWidthGrowth, 0);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
