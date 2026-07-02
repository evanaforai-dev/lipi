// Sanity check for the deterministic prioritization logic.
import { computeImpactScore, impactBand } from "../src/shared/impact";
import { buildRootCauses, buildSummary } from "../src/main/analysis/rootcause";
import type { Issue } from "../src/shared/types";

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} → ${JSON.stringify(actual)}${ok ? "" : ` (want ${JSON.stringify(expected)})`}`);
}

// Formula + the required ranking guarantee
expect("error×1", computeImpactScore("error", 1), 100);
expect("error×20", computeImpactScore("error", 20), 2000);
expect("error×20 > error×1", computeImpactScore("error", 20) > computeImpactScore("error", 1), true);
expect("warning×4", computeImpactScore("warning", 4), 200);
expect("no instanceCount → reach 1", computeImpactScore("info"), 10);
expect("band high", impactBand(2000), "high");
expect("band medium", impactBand(100), "medium");
expect("band low", impactBand(10), "low");

// Aggregation: 3 issues, 2 share a Button component, 2 share the overflow check
const mk = (id: string, checkId: Issue["checkId"], sev: Issue["severity"], nodeId: string, comp?: string, inst?: number): Issue => ({
  id, checkId, severity: sev, nodeId, nodeName: nodeId, scripts: ["devanagari"],
  message: "", impactScore: computeImpactScore(sev, inst),
  ...(comp ? { componentId: comp, componentName: "Button", instanceCount: inst } : {}),
});
const issues: Issue[] = [
  mk("n1:overflow", "overflow", "error", "n1", "btn", 20), // 2000
  mk("n2:overflow", "overflow", "error", "n2", "btn", 20), // 2000
  mk("n3:line-clip", "line-clip", "warning", "n3"), //          50
];

const causes = buildRootCauses(issues);
const btn = causes.find((c) => c.id === "component:btn");
const overflow = causes.find((c) => c.id === "check:overflow");
expect("Button cause issueCount", btn?.issueCount, 2);
expect("Button cause impactScore (sum)", btn?.impactScore, 4000);
expect("Button cause affectedNodes", btn?.affectedNodes, 2);
expect("Overflow cause issueCount", overflow?.issueCount, 2);
expect("rootCauses sorted desc", causes.map((c) => c.impactScore), [4000, 4000, 50]);

const summary = buildSummary(issues);
expect("summary", summary, { totalIssues: 3, highImpact: 2, mediumImpact: 1, lowImpact: 0, affectedComponents: 1 });

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
