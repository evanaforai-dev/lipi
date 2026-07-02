import type { CheckId, Issue, Report } from "../shared/types";

// PRESENTATION LAYER ONLY. Reshapes the frozen Report into a screen-first review model:
// per screen → issues grouped by type, each type carrying a plain-language recommendation.
// Nothing in analysis changes — every item still references the existing Issue.

// One designer-facing category per engine check. Coarse on purpose: a screen summarises as
// "Overflow · Typography · Spacing", not a wall of individual findings.
const CATEGORY_LABEL: Record<CheckId, string> = {
  overflow: "Overflow",
  "small-indic": "Typography",
  "line-clip": "Spacing",
  "missing-font": "Unsupported Fonts",
};
const CATEGORY_ORDER: CheckId[] = ["overflow", "small-indic", "line-clip", "missing-font"];

// The prominent, plain recommendation for each issue type. Reuses the engine's intent — no
// new analysis, just designer-friendly phrasing shown once per group.
const RECOMMENDATION: Record<CheckId, string> = {
  overflow: "Let the container grow, or shorten the copy so it fits.",
  "small-indic": "Increase the text size so localized characters stay legible.",
  "line-clip": "Add line height so tall characters aren't clipped.",
  "missing-font": "Switch to a font that supports this language.",
};

export interface ScreenItem {
  issue: Issue;
  problem: string; // plain-language description of what happens after localization
}
export interface IssueGroup {
  category: string;
  checkId: CheckId;
  recommendation: string;
  items: ScreenItem[];
  nodeIds: string[]; // affected layers, for "Reveal instances"
}
export interface ScreenView {
  screenId: string;
  screenName: string;
  hasIssues: boolean;
  status: string; // soft, non-alarming ("Needs Attention" / "No localization issues")
  summary: string; // "Overflow · Typography · Spacing"
  groups: IssueGroup[];
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven"];
const word = (s: string) => WORDS[Number(s)] ?? s;
const firstPx = (s: string) => /(\d+)\s*px/.exec(s)?.[1] ?? null;

/** Plain, factual description of one issue (no node name — the row shows it). */
export function describe(issue: Issue): string {
  const msg = issue.message;
  const detail = issue.detail ?? "";

  switch (issue.checkId) {
    case "overflow": {
      if (/wrapped/i.test(msg)) {
        const m = /(\d+)\s*→\s*(\d+)\s*lines/.exec(detail);
        return m
          ? `Wraps from ${word(m[1])} line to ${word(m[2])}.`
          : "Wraps onto more lines after localization.";
      }
      if (/screen grew/i.test(msg)) return "Becomes taller after localization.";
      if (/pushed nearby/i.test(msg)) {
        const p = firstPx(msg);
        return p ? `Shifts nearby elements by ${p}px.` : "Shifts nearby elements.";
      }
      if (/needed/i.test(msg)) {
        const p = firstPx(msg);
        return p ? `Expands by ${p}px after localization.` : "Needs more space after localization.";
      }
      if (/truncate/i.test(msg)) return "Truncated — localized copy is cut off.";
      {
        const p = firstPx(detail);
        return p ? `Overflows its container by ${p}px.` : "Overflows its container.";
      }
    }
    case "small-indic": {
      const now = firstPx(detail);
      const rec = /≥\s*(\d+)\s*px/.exec(detail)?.[1];
      return now && rec ? `${now}px — smaller than the ${rec}px minimum.` : "Too small to read comfortably.";
    }
    case "line-clip":
      return "Tight line spacing may clip tall characters.";
    case "missing-font":
      return "The current font can't render this language.";
  }
}

export function buildScreenViews(report: Report, issueById: Map<string, Issue>): ScreenView[] {
  return report.screens.map((screen) => {
    const byCheck = new Map<CheckId, ScreenItem[]>();
    for (const id of screen.issueIds) {
      const issue = issueById.get(id);
      if (!issue) continue;
      const arr = byCheck.get(issue.checkId) ?? [];
      arr.push({ issue, problem: describe(issue) });
      byCheck.set(issue.checkId, arr);
    }

    const groups: IssueGroup[] = CATEGORY_ORDER.filter((c) => byCheck.has(c)).map((checkId) => {
      const items = byCheck.get(checkId)!;
      return {
        category: CATEGORY_LABEL[checkId],
        checkId,
        recommendation: RECOMMENDATION[checkId],
        items,
        nodeIds: [...new Set(items.map((i) => i.issue.nodeId))],
      };
    });

    const hasIssues = groups.length > 0;
    return {
      screenId: screen.id,
      screenName: screen.name,
      hasIssues,
      status: hasIssues ? "Needs Attention" : "No localization issues",
      summary: hasIssues ? groups.map((g) => g.category).join(" · ") : "Looks good",
      groups,
    };
  });
}
