// Deterministic fixtures for the Delta Adapter (pressure → Issue[]). No Figma.
import { classifyPressure, createPressureIssues, dedupeIssues } from "../src/main/delta/adapter";
import type { NodeDelta, FrameDelta, DeltaResult } from "../src/main/delta/compute";
import type { Issue } from "../src/shared/types";

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} → ${JSON.stringify(actual)}${ok ? "" : ` (want ${JSON.stringify(expected)})`}`);
}

const nd = (over: Partial<NodeDelta>): NodeDelta => ({
  nodeId: "", nodeName: "", widthBefore: 0, widthAfter: 0, widthGrowth: 0,
  heightBefore: 0, heightAfter: 0, heightGrowth: 0,
  lineEstimateBefore: 1, lineEstimateAfter: 1, lineGrowth: 0,
  positionBefore: null, positionAfter: null, deltaX: 0, deltaY: 0, ...over,
});

// A: expands + wraps (dominant WRAP, error). B: displaced (info). C: expands (warning).
// D: below all thresholds (no issue). Frame F: grew 300px (error).
const nodes: NodeDelta[] = [
  nd({ nodeId: "a", nodeName: "Button Label", widthBefore: 84, widthAfter: 184, widthGrowth: 100, heightBefore: 24, heightAfter: 54, heightGrowth: 30, lineEstimateBefore: 1, lineEstimateAfter: 3, lineGrowth: 2 }),
  nd({ nodeId: "b", nodeName: "Sibling", deltaY: 40 }),
  nd({ nodeId: "c", nodeName: "Card Title", heightBefore: 20, heightAfter: 80, heightGrowth: 60 }),
  nd({ nodeId: "d", nodeName: "Tiny", widthGrowth: 20, deltaY: 10 }),
];
const frames: FrameDelta[] = [
  { frameId: "F", frameName: "Screen", frameWidthGrowth: 0, frameHeightGrowth: 300 },
];
const delta: DeltaResult = { nodes, frames, siblingsMoved: 1, largestSiblingShift: 40 };

const { issues, counts } = classifyPressure(delta);

// --- counts per pressure type ---
expect("expansion count", counts.expansion, 2); // A + C
expect("wrap count", counts.wrap, 1); // A
expect("displacement count", counts.displacement, 1); // B
expect("frame growth count", counts.frameGrowth, 1); // F
expect("total", counts.total, 5);

// --- issues (deduped per node) ---
expect("issue count", issues.length, 4); // A, B, C, F (D none)
const ids = issues.map((i) => i.id);
expect("no duplicate ids", ids.length === new Set(ids).size, true);

const byId = (id: string) => issues.find((i) => i.id === id)!;
// --- severity mapping ---
expect("A severity (wrap ≥2 → error)", byId("a:overflow").severity, "error");
expect("A message is wrap", byId("a:overflow").message.includes("wrapped"), true);
expect("B severity (40px shift → info)", byId("b:overflow").severity, "info");
expect("C severity (60px grow → warning)", byId("c:overflow").severity, "warning");
expect("F severity (300px frame → error)", byId("F:overflow").severity, "error");

// --- schema: adapter output looks exactly like a static Issue ---
const schemaOk = (i: Issue) =>
  typeof i.id === "string" &&
  i.checkId === "overflow" &&
  ["error", "warning", "info"].includes(i.severity) &&
  typeof i.nodeId === "string" &&
  typeof i.nodeName === "string" &&
  Array.isArray(i.scripts) &&
  typeof i.message === "string" &&
  typeof i.impactScore === "number";
expect("every issue matches Issue schema", issues.every(schemaOk), true);

// --- dedupeIssues merges a static + delta collision keeping higher severity ---
const staticDup: Issue = {
  id: "a:overflow", checkId: "overflow", severity: "info", nodeId: "a", nodeName: "Button Label",
  scripts: ["devanagari"], message: "static overflow", impactScore: 0,
};
const merged = dedupeIssues([staticDup, ...createPressureIssues(delta)]);
expect("dedupe removes id collision", merged.filter((i) => i.id === "a:overflow").length, 1);
expect("dedupe keeps higher severity (error over info)", merged.find((i) => i.id === "a:overflow")!.severity, "error");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
