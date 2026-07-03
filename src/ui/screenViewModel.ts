import type { CheckId, Issue, Report } from "../shared/types";

// PRESENTATION LAYER ONLY. Reshapes the frozen Report into a screen → problem → layer tree so
// the Screen tab scales to hundreds of issues: each problem TYPE is listed once with a single
// recommendation, and the individual layers sit behind disclosure. Nothing in analysis changes.

const TYPE_LABEL: Record<CheckId, string> = {
  overflow: "Overflow",
  "small-indic": "Small text",
  "line-clip": "Clipping",
  "missing-font": "Font support",
};
const TYPE_ORDER: CheckId[] = ["overflow", "small-indic", "line-clip", "missing-font"];

// One plain recommendation per problem type — shown once on the group, never per layer.
const RECOMMENDATION: Record<CheckId, string> = {
  overflow: "Let the container grow, or shorten the copy.",
  "small-indic": "Increase the size so localized copy stays legible.",
  "line-clip": "Add line height so tall characters aren't clipped.",
  "missing-font": "Switch to a font that supports this language.",
};

export interface Layer {
  issue: Issue;
  name: string; // node name
  detail: string; // the one value that differs per layer, e.g. "11px" ("" when nothing to add)
}
export interface IssueGroup {
  checkId: CheckId;
  label: string;
  recommendation: string;
  layers: Layer[];
  nodeIds: string[]; // affected layers, for the group-level "Reveal all"
}
export interface ScreenView {
  screenId: string;
  screenName: string;
  findingCount: number;
  typeSummary: string; // "Overflow · Small text" — the problem types, for the collapsed row
  groups: IssueGroup[];
}

const firstPx = (s: string) => /(\d+)\s*px/.exec(s)?.[1] ?? null;

/** The single value worth showing next to a layer name (what's unique about this instance). */
function layerDetail(issue: Issue): string {
  const msg = issue.message;
  const detail = issue.detail ?? "";
  switch (issue.checkId) {
    case "small-indic": {
      const p = firstPx(detail);
      return p ? `${p}px` : "";
    }
    case "overflow": {
      if (/wrapped/i.test(msg)) {
        const m = /→\s*(\d+)\s*lines/.exec(detail);
        return m ? `${m[1]} lines` : "wraps";
      }
      if (/screen grew/i.test(msg)) {
        const p = firstPx(msg);
        return p ? `+${p}px` : "taller";
      }
      if (/pushed nearby/i.test(msg)) {
        const p = firstPx(msg);
        return p ? `shifts ${p}px` : "shifts";
      }
      if (/needed/i.test(msg)) {
        const p = firstPx(msg);
        return p ? `+${p}px` : "";
      }
      if (/truncate/i.test(msg)) return "clipped";
      const p = firstPx(detail);
      return p ? `${p}px over` : "";
    }
    case "line-clip":
      return "";
    case "missing-font":
      return "";
  }
}

export function buildScreenViews(report: Report, issueById: Map<string, Issue>): ScreenView[] {
  const views: ScreenView[] = [];
  for (const screen of report.screens) {
    if (screen.issueCount === 0) continue; // only screens that need review

    const byCheck = new Map<CheckId, Layer[]>();
    for (const id of screen.issueIds) {
      const issue = issueById.get(id);
      if (!issue) continue;
      const arr = byCheck.get(issue.checkId) ?? [];
      arr.push({ issue, name: issue.nodeName, detail: layerDetail(issue) });
      byCheck.set(issue.checkId, arr);
    }
    if (byCheck.size === 0) continue;

    const groups: IssueGroup[] = TYPE_ORDER.filter((c) => byCheck.has(c)).map((checkId) => {
      const layers = byCheck.get(checkId)!;
      return {
        checkId,
        label: TYPE_LABEL[checkId],
        recommendation: RECOMMENDATION[checkId],
        layers,
        nodeIds: [...new Set(layers.map((l) => l.issue.nodeId))],
      };
    });

    views.push({
      screenId: screen.id,
      screenName: screen.name,
      findingCount: groups.reduce((n, g) => n + g.layers.length, 0),
      typeSummary: groups.map((g) => g.label).join(" · "),
      groups,
    });
  }
  return views;
}
