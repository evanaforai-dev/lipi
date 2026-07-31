import type { CheckId, Issue, Report } from "../shared/types";

// PRESENTATION LAYER ONLY. Reshapes the frozen Report into a screen → problem → layer tree.
// The Screen view is pure triage: what's wrong and where. The FIX (recommendation) lives once
// in the Design System view, reached via a link — so advice is never repeated per screen.

// Plain problem names — recognized, not read. Used for both the collapsed summary and groups.
const TYPE_LABEL: Record<CheckId, string> = {
  overflow: "Text overflow",
  "small-indic": "Text too small",
  "line-clip": "Clipped lines",
  "missing-font": "Unsupported font",
};
const TYPE_ORDER: CheckId[] = ["overflow", "small-indic", "line-clip", "missing-font"];

// One quiet colour per pressure type — the plugin's only colour language. Used as small dots,
// never as fills, so the UI gains identity without shouting. Tuned to read on light and dark.
export const TYPE_COLOR: Record<CheckId, string> = {
  overflow: "#E08542", // amber — text spilling its container
  "small-indic": "#7B6BEC", // violet — sub-legible type
  "line-clip": "#3E9BE9", // blue — clipped stacked marks
  "missing-font": "#E0576B", // rose — missing glyphs
};

export interface Layer {
  issue: Issue;
  name: string; // node name
  detail: string; // the one value that differs per layer, e.g. "11px" ("" when nothing to add)
}
export interface IssueGroup {
  checkId: CheckId;
  label: string;
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
