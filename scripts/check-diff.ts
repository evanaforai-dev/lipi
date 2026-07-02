// Sanity check for the scan diff (Verify Mode).
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

const mk = (nodeId: string, checkId: Issue["checkId"], comp?: string, inst?: number): Issue => ({
  id: `${nodeId}:${checkId}`, checkId, severity: "error", nodeId, nodeName: nodeId,
  scripts: ["devanagari"], message: "", impactScore: computeImpactScore("error", inst),
  ...(comp ? { componentId: comp, componentName: "Button", instanceCount: inst } : {}),
});

const report = (issues: Issue[]): Report => ({
  scope: "selection", scanId: "s", createdAt: 0, scannedNodes: 10, issues,
  summary: buildSummary(issues), rootCauses: buildRootCauses(issues),
  screens: [], affectedScreens: 0, cleanScreens: 0,
});

// Previous: 3 issues (2 on Button). Current: n2 fixed, n4 newly broken.
const prev = report([mk("n1", "overflow", "btn", 4), mk("n2", "overflow", "btn", 4), mk("n3", "line-clip")]);
const curr = report([mk("n1", "overflow", "btn", 4), mk("n3", "line-clip"), mk("n4", "small-indic")]);

const { diff, resolvedIssues } = diffReports(prev, curr);

expect("diff counts", diff, { resolved: 1, new: 1, unchanged: 2 });
expect("resolved issue id", resolvedIssues.map((i) => i.id), ["n2:overflow"]);
expect("resolved status", resolvedIssues[0].status, "resolved");
expect("n1 unchanged", curr.issues.find((i) => i.nodeId === "n1")?.status, "unchanged");
expect("n4 new", curr.issues.find((i) => i.nodeId === "n4")?.status, "new");

const btn = curr.rootCauses.find((c) => c.id === "component:btn");
expect("Button cause now 1 issue", btn?.issueCount, 1);
expect("Button previousIssueCount", btn?.previousIssueCount, 2);
expect("Button resolvedCount", btn?.resolvedCount, 1);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
