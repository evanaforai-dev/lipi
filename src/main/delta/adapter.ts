import type { Issue, Severity } from "../../shared/types";
import type { DeltaResult } from "./compute";

// Milestone 4: the delta adapter. Geometry deltas → standard Issue[]. The Delta Engine
// becomes just another producer of Issues; assembleReport cannot tell the difference.
//
// New pressure types (EXPANSION / WRAP / DISPLACEMENT / FRAME_GROWTH) are an INTERNAL
// classification. Every emitted Issue uses the existing checkId vocabulary + fixContext,
// so the frozen Fix Engine and Root Cause aggregation keep working unchanged.

// One place for every threshold. Intentionally conservative for v1 — easier to relax
// after testing than to flood the user with noisy recommendations.
export const PRESSURE_THRESHOLDS = {
  widthGrowth: 32, // px — EXPANSION (width)
  heightGrowth: 32, // px — EXPANSION (height)
  lineGrowth: 1, // lines — WRAP
  siblingShift: 32, // px — DISPLACEMENT
  frameGrowth: 96, // px — FRAME_GROWTH
};

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

// Deterministic severity from magnitude relative to a trigger. No scoring model.
function pxSeverity(value: number, trigger: number): Severity {
  if (value >= trigger * 3) return "error";
  if (value >= trigger * 1.75) return "warning";
  return "info";
}

export interface PressureCounts {
  expansion: number;
  wrap: number;
  displacement: number;
  frameGrowth: number;
  total: number;
}

interface Candidate {
  severity: Severity;
  message: string;
  detail: string;
  fixContext: "fixed-width" | "auto-layout";
  priority: number; // tie-break: wrap > expansion > displacement
}

const round = Math.round;

/** Classify a delta into pressure Issues (deduped per node) plus per-type counts. */
export function classifyPressure(delta: DeltaResult): {
  issues: Issue[];
  counts: PressureCounts;
} {
  const T = PRESSURE_THRESHOLDS;
  const counts: PressureCounts = {
    expansion: 0,
    wrap: 0,
    displacement: 0,
    frameGrowth: 0,
    total: 0,
  };
  const issues: Issue[] = [];

  for (const d of delta.nodes) {
    const candidates: Candidate[] = [];

    const grow = Math.max(d.widthGrowth, d.heightGrowth);
    if (d.widthGrowth >= T.widthGrowth || d.heightGrowth >= T.heightGrowth) {
      counts.expansion++;
      candidates.push({
        severity: pxSeverity(grow, T.widthGrowth),
        message: `Localized content needed +${round(grow)}px of space.`,
        detail: `width ${round(d.widthBefore)}→${round(d.widthAfter)}, height ${round(d.heightBefore)}→${round(d.heightAfter)}`,
        fixContext: "auto-layout",
        priority: 2,
      });
    }

    if (d.lineGrowth >= T.lineGrowth) {
      counts.wrap++;
      candidates.push({
        severity: d.lineGrowth >= 2 ? "error" : "warning",
        message: `Text wrapped to ${d.lineEstimateAfter} lines after localization.`,
        detail: `${d.lineEstimateBefore} → ${d.lineEstimateAfter} lines`,
        fixContext: "fixed-width",
        priority: 3,
      });
    }

    const shift = Math.max(Math.abs(d.deltaX), Math.abs(d.deltaY));
    if (shift >= T.siblingShift) {
      counts.displacement++;
      candidates.push({
        severity: pxSeverity(shift, T.siblingShift),
        message: `Localized content pushed nearby elements ${round(shift)}px.`,
        detail: `moved ${round(d.deltaX)}px × / ${round(d.deltaY)}px y`,
        fixContext: "auto-layout",
        priority: 1,
      });
    }

    if (candidates.length === 0) continue;
    // One issue per node (id is `${nodeId}:overflow`) — dominant = highest severity,
    // tie-break by priority. Prevents duplicate ids.
    candidates.sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.priority - a.priority,
    );
    const top = candidates[0];
    issues.push({
      id: `${d.nodeId}:overflow`,
      checkId: "overflow",
      severity: top.severity,
      nodeId: d.nodeId,
      nodeName: d.nodeName,
      scripts: [],
      message: top.message,
      detail: top.detail,
      impactScore: 0, // assembleReport recomputes
      fixContext: top.fixContext,
    });
  }

  for (const f of delta.frames) {
    const grow = Math.max(f.frameWidthGrowth, f.frameHeightGrowth);
    if (f.frameWidthGrowth >= T.frameGrowth || f.frameHeightGrowth >= T.frameGrowth) {
      counts.frameGrowth++;
      issues.push({
        id: `${f.frameId}:overflow`,
        checkId: "overflow",
        severity: pxSeverity(grow, T.frameGrowth),
        nodeId: f.frameId,
        nodeName: f.frameName,
        scripts: [],
        message: `The screen grew +${round(grow)}px after localization.`,
        detail: `frame +${round(f.frameWidthGrowth)}px × / +${round(f.frameHeightGrowth)}px y`,
        impactScore: 0,
        fixContext: "auto-layout",
      });
    }
  }

  counts.total = counts.expansion + counts.wrap + counts.displacement + counts.frameGrowth;
  return { issues, counts };
}

/** Public API: geometry delta → standard Issue[]. */
export function createPressureIssues(delta: DeltaResult): Issue[] {
  return classifyPressure(delta).issues;
}

/** Merge issue lists (static + delta), keeping the highest-severity issue per id. */
export function dedupeIssues(issues: Issue[]): Issue[] {
  const byId = new Map<string, Issue>();
  for (const issue of issues) {
    const existing = byId.get(issue.id);
    if (!existing || SEVERITY_RANK[issue.severity] < SEVERITY_RANK[existing.severity]) {
      byId.set(issue.id, issue);
    }
  }
  return [...byId.values()];
}

/** Debug summary + top 10 pressure findings. */
export function printPressure(delta: DeltaResult): void {
  const { issues, counts } = classifyPressure(delta);
  const label: Record<Severity, string> = { error: "HIGH", warning: "MEDIUM", info: "LOW" };

  console.log("========= PRESSURE =========");
  console.log("Expansion    ", counts.expansion);
  console.log("Wrap         ", counts.wrap);
  console.log("Displacement ", counts.displacement);
  console.log("Frame Growth ", counts.frameGrowth);
  console.log("Total        ", counts.total);
  console.log("============================");
  for (const issue of issues.slice(0, 10)) {
    console.log(`\n${issue.nodeName}`);
    console.log(`  ${issue.message}`);
    console.log(`  ${label[issue.severity]}`);
  }
}
