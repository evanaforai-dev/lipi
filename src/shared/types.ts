// Data models that cross the postMessage bridge. Flat & serializable:
// no class instances, no Figma node references — node identity travels as a string id.

export type Severity = "error" | "warning" | "info";

/** Verify Mode: how an issue changed since the previous scan. */
export type IssueStatus = "new" | "resolved" | "unchanged";

export type CheckId =
  | "overflow" // text clipped/truncated by its container
  | "line-clip" // line-height too tight for stacked Indic marks
  | "missing-font" // font lacks glyphs for the script (tofu risk)
  | "small-indic"; // font size too small for Indic legibility

/** Scripts the MVP recognises. More Indic blocks plug in via SCRIPT_RANGES later. */
export type ScriptId = "latin" | "devanagari" | "bengali" | "tamil";

export interface Issue {
  id: string; // stable: `${nodeId}:${checkId}`
  checkId: CheckId;
  severity: Severity;
  nodeId: string; // for the SELECT_NODE round-trip
  nodeName: string; // shown in the list
  scripts: ScriptId[]; // scripts detected in the node
  message: string; // human-readable summary
  detail?: string; // optional measured numbers
  impactScore: number; // severity × component reach — see shared/impact.ts
  status?: IssueStatus; // set by the scan diff (Verify Mode)

  // Set when the flagged node lives inside a component instance.
  componentId?: string; // main component node id — target of "Go To Component"
  componentName?: string;
  instanceCount?: number; // instances of that component on the page (≥ 1)

  // Screen identity (Screen Intelligence).
  pageId?: string;
  pageName?: string;
  frameId?: string; // top-level frame = the screen (undefined if not inside a frame)
  frameName?: string;

  // Layout context used by the Fix Engine (set by the overflow check only).
  fixContext?: "fixed-width" | "auto-layout";
}

export type Confidence = "high" | "medium" | "low";

/** A deterministic, rule-based remedy for a root cause (no AI). */
export interface SuggestedFix {
  pattern: string; // the system pattern, e.g. "FIXED-WIDTH BUTTONS"
  title: string; // the recommendation
  justification: string; // why THIS fix is appropriate (design-system reasoning)
  description: string; // the problem statement
  expectedImpact: string; // reach language, e.g. "Fix once, improves M screens"
  confidence: Confidence;
}

/** An aggregation: many issues that one fix (a component, or a check type) would address. */
export interface RootCause {
  id: string; // `component:${componentId}` or `check:${checkId}`
  title: string; // component name, or check label
  issueCount: number;
  affectedNodes: number; // distinct nodes
  affectedComponents: number; // distinct components
  impactScore: number; // sum of member issue impactScores
  issueIds: string[];
  affectedScreens: number; // distinct screens among members
  evidence: { checkId: CheckId; count: number }[]; // issue-type breakdown, sorted desc
  suggestedFix: SuggestedFix; // from the Fix Engine
  previousIssueCount?: number; // this cause's issue count in the previous scan (Verify Mode)
  resolvedCount?: number; // members present last scan, now gone
}

export interface ReportSummary {
  totalIssues: number;
  highImpact: number; // count of issues in each band (see shared/impact.ts)
  mediumImpact: number;
  lowImpact: number;
  affectedComponents: number; // distinct components across all issues
}

/** One screen (top-level frame) and its issue rollup. */
export interface ScreenSummary {
  id: string; // frame id
  name: string;
  pageId: string;
  pageName: string;
  issueCount: number;
  highImpact: number;
  mediumImpact: number;
  lowImpact: number;
  impactScore: number; // sum of member issue impactScores
  issueIds: string[];
  previousIssueCount?: number; // Verify Mode
  resolvedCount?: number;
}

/** Verify Mode: counts of how issues changed between the previous and current scan. */
export interface ScanDiff {
  resolved: number; // in previous scan, gone now
  new: number; // not in previous scan
  unchanged: number; // present in both
}

export interface Report {
  scope: "selection";
  scanId: string;
  createdAt: number; // epoch ms
  scannedNodes: number;
  issues: Issue[]; // current issues, sorted by impactScore desc
  summary: ReportSummary;
  rootCauses: RootCause[]; // sorted by impactScore, descending
  screens: ScreenSummary[]; // sorted by impactScore, descending
  affectedScreens: number; // screens with ≥ 1 issue
  cleanScreens: number; // scanned screens with 0 issues
  diff?: ScanDiff; // present from the 2nd scan onward
  resolvedIssues?: Issue[]; // issues resolved since the previous scan (status: "resolved")
}
