// Sanity check for Screen Intelligence aggregation + screen diff.
import { buildScreens, type ScannedScreen } from "../src/main/analysis/screens";
import { diffReports } from "../src/main/diff";
import { computeImpactScore } from "../src/shared/impact";
import { buildRootCauses, buildSummary } from "../src/main/analysis/rootcause";
import type { Issue, Report } from "../src/shared/types";

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} → ${JSON.stringify(actual)}${ok ? "" : ` (want ${JSON.stringify(expected)})`}`);
}

const mk = (nodeId: string, frame: string, sev: Issue["severity"], inst?: number): Issue => ({
  id: `${nodeId}:overflow`, checkId: "overflow", severity: sev, nodeId, nodeName: nodeId,
  scripts: ["devanagari"], message: "", impactScore: computeImpactScore(sev, inst),
  frameId: frame, frameName: frame, pageId: "p1", pageName: "Page 1",
});

// 3 screens scanned; Settings is clean (no issues).
const screensMeta = new Map<string, ScannedScreen>([
  ["checkout", { name: "Checkout", pageId: "p1", pageName: "Page 1" }],
  ["pdp", { name: "Product Detail", pageId: "p1", pageName: "Page 1" }],
  ["settings", { name: "Settings", pageId: "p1", pageName: "Page 1" }],
]);

const build = (issues: Issue[]): Report => {
  const s = buildScreens(issues, screensMeta);
  return {
    scope: "selection", scanId: "x", createdAt: 0, scannedNodes: 9, issues,
    summary: buildSummary(issues), rootCauses: buildRootCauses(issues),
    screens: s.screens, affectedScreens: s.affectedScreens, cleanScreens: s.cleanScreens,
  };
};

// Previous: Checkout 3 (all high-reach errors), Product Detail 1, Settings 0.
const prev = build([
  mk("c1", "checkout", "error", 20), mk("c2", "checkout", "error", 20), mk("c3", "checkout", "error", 20),
  mk("d1", "pdp", "warning"),
]);

expect("screen order (impact desc)", prev.screens.map((s) => s.name), ["Checkout", "Product Detail", "Settings"]);
expect("Checkout issueCount", prev.screens[0].issueCount, 3);
expect("Checkout all high band", prev.screens[0].highImpact, 3);
expect("Settings clean", prev.screens[2].issueCount, 0);
expect("affectedScreens", prev.affectedScreens, 2);
expect("cleanScreens", prev.cleanScreens, 1);

// Current: Checkout fixed 2 of 3.
const curr = build([mk("c1", "checkout", "error", 20), mk("d1", "pdp", "warning")]);
diffReports(prev, curr);
const checkout = curr.screens.find((s) => s.id === "checkout");
expect("Checkout now 1 issue", checkout?.issueCount, 1);
expect("Checkout previousIssueCount", checkout?.previousIssueCount, 3);
expect("Checkout resolvedCount", checkout?.resolvedCount, 2);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
