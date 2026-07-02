// Sanity check for the Fix Engine + root-cause evidence/fix attachment.
import { suggestFix } from "../src/shared/fix";
import { buildRootCauses } from "../src/main/analysis/rootcause";
import { computeImpactScore } from "../src/shared/impact";
import type { Issue } from "../src/shared/types";

let failures = 0;
function expect(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} → ${JSON.stringify(actual)}${ok ? "" : ` (want ${JSON.stringify(expected)})`}`);
}

// --- Fix Engine rules ---
expect("overflow+fixed → hug", suggestFix({ checkId: "overflow", fixContext: "fixed-width", isComponent: true, resolvesIssues: 24, resolvesScreens: 18, totalIssues: 24 }).title, "Convert fixed width to Hug Contents");
expect("overflow+autolayout → grow", suggestFix({ checkId: "overflow", fixContext: "auto-layout", isComponent: true, resolvesIssues: 5, resolvesScreens: 4, totalIssues: 5 }).title, "Allow the container to grow");
expect("line-clip", suggestFix({ checkId: "line-clip", isComponent: true, resolvesIssues: 3, resolvesScreens: 2, totalIssues: 3 }).title, "Increase line height to a safe range");
expect("small-indic", suggestFix({ checkId: "small-indic", isComponent: true, resolvesIssues: 2, resolvesScreens: 1, totalIssues: 2 }).title, "Increase the minimum text size");
expect("missing-font confidence medium", suggestFix({ checkId: "missing-font", isComponent: true, resolvesIssues: 9, resolvesScreens: 5, totalIssues: 9 }).confidence, "medium");
expect("pattern: overflow+fixed+component", suggestFix({ checkId: "overflow", fixContext: "fixed-width", isComponent: true, resolvesIssues: 24, resolvesScreens: 18, totalIssues: 24 }).pattern, "FIXED-WIDTH BUTTONS");
expect("pattern: overflow+fixed+container", suggestFix({ checkId: "overflow", fixContext: "fixed-width", isComponent: false, resolvesIssues: 4, resolvesScreens: 3, totalIssues: 4 }).pattern, "CONSTRAINED CONTAINERS");
expect("pattern: overflow+autolayout", suggestFix({ checkId: "overflow", fixContext: "auto-layout", isComponent: true, resolvesIssues: 5, resolvesScreens: 4, totalIssues: 5 }).pattern, "CONTENT CONSTRAINTS");
expect("pattern: line-clip", suggestFix({ checkId: "line-clip", isComponent: false, resolvesIssues: 3, resolvesScreens: 2, totalIssues: 3 }).pattern, "TIGHT LINE HEIGHTS");
expect("reach wording", suggestFix({ checkId: "overflow", fixContext: "fixed-width", isComponent: true, resolvesIssues: 24, resolvesScreens: 18, totalIssues: 24 }).expectedImpact, "Fix once, improves 18 screens");
expect("justification (fixed-width)", suggestFix({ checkId: "overflow", fixContext: "fixed-width", isComponent: true, resolvesIssues: 24, resolvesScreens: 18, totalIssues: 24 }).justification, "Removes the width constraint while preserving the component's existing layout behavior.");
expect("justification (line-clip)", suggestFix({ checkId: "line-clip", isComponent: false, resolvesIssues: 3, resolvesScreens: 2, totalIssues: 3 }).justification, "Prevents clipping without changing content length or component structure.");
expect("missing-font title aligned", suggestFix({ checkId: "missing-font", isComponent: false, resolvesIssues: 9, resolvesScreens: 5, totalIssues: 9 }).title, "Add language support to the font stack");
expect("dominant minority downgrades high→medium", suggestFix({ checkId: "overflow", fixContext: "fixed-width", isComponent: true, resolvesIssues: 4, resolvesScreens: 2, totalIssues: 10 }).confidence, "medium");

// --- Root cause attaches evidence + fix (dominant = overflow, mixed cause) ---
const mk = (nodeId: string, checkId: Issue["checkId"], frame: string, ctx?: Issue["fixContext"]): Issue => ({
  id: `${nodeId}:${checkId}`, checkId, severity: "error", nodeId, nodeName: nodeId,
  scripts: ["devanagari"], message: "", impactScore: computeImpactScore("error", 20),
  componentId: "btn", componentName: "Primary Button", instanceCount: 20,
  frameId: frame, frameName: frame, pageId: "p", pageName: "Page",
  ...(ctx ? { fixContext: ctx } : {}),
});
// Primary Button: 3 overflow (fixed-width) + 1 line-clip across 3 screens.
const issues = [
  mk("a", "overflow", "Home", "fixed-width"),
  mk("b", "overflow", "Checkout", "fixed-width"),
  mk("c", "overflow", "Profile", "fixed-width"),
  mk("d", "line-clip", "Home"),
];
const causes = buildRootCauses(issues);
const btn = causes.find((c) => c.id === "component:btn")!;
expect("evidence sorted desc", btn.evidence, [{ checkId: "overflow", count: 3 }, { checkId: "line-clip", count: 1 }]);
expect("affectedScreens", btn.affectedScreens, 3);
expect("fix title (dominant overflow/fixed)", btn.suggestedFix.title, "Convert fixed width to Hug Contents");
expect("pattern (component overflow → buttons)", btn.suggestedFix.pattern, "FIXED-WIDTH BUTTONS");
expect("reach = dominant screens (3)", btn.suggestedFix.expectedImpact, "Fix once, improves 3 screens");
expect("confidence downgraded (3 of 4 = 75% ≥ 60%, stays high)", btn.suggestedFix.confidence, "high");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
