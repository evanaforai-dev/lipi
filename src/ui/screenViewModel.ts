import type { Issue, Report, Severity } from "../shared/types";

// PRESENTATION LAYER ONLY. Transforms the frozen Report into a screen-first view model:
// per screen → issues grouped by a designer-friendly category, with a screen severity.
// Nothing in analysis changes — every item still references the existing Issue.

// Designer-facing group titles. Finer than the engine's checkId vocabulary: the "overflow"
// check covers several distinct behaviours (expansion, wrapping, displacement, growth), and
// designers reason about those as separate problems. This split is pure presentation.
const CATEGORY_ORDER = ["Overflow", "Wrap", "Displacement", "Typography", "Spacing", "Fonts"];

/** Which designer-facing group an issue belongs to (presentation-only classification). */
function categoryOf(issue: Issue): string {
  switch (issue.checkId) {
    case "small-indic":
      return "Typography";
    case "line-clip":
      return "Spacing";
    case "missing-font":
      return "Fonts";
    case "overflow":
      if (/wrapped/i.test(issue.message)) return "Wrap";
      if (/pushed nearby/i.test(issue.message)) return "Displacement";
      return "Overflow"; // expansion, frame growth, truncation, generic overflow
  }
}

const SEVERITY_RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

export interface ScreenItem {
  issue: Issue;
  description: string; // plain design language (no engine terminology)
}
export interface IssueGroupView {
  title: string;
  items: ScreenItem[];
}
export interface ScreenView {
  screenId: string;
  screenName: string;
  severity: Severity; // worst issue on the screen — drives the header indicator
  issueCount: number;
  groups: IssueGroupView[];
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven"];
const word = (s: string) => WORDS[Number(s)] ?? s;
const firstPx = (s: string) => /(\d+)\s*px/.exec(s)?.[1] ?? null;

/** Designer-oriented, engine-free phrasing for one issue (no node name — the card shows it). */
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
      return now && rec
        ? `${now}px localized text. Recommend minimum ${rec}px.`
        : "Too small to read comfortably.";
    }
    case "line-clip":
      return "Tight line spacing may clip letters.";
    case "missing-font":
      return "Uses a font that can't render this language.";
  }
}

export function buildScreenViews(report: Report, issueById: Map<string, Issue>): ScreenView[] {
  const views: ScreenView[] = [];
  for (const screen of report.screens) {
    if (screen.issueCount === 0) continue; // only screens with problems

    const byCat = new Map<string, ScreenItem[]>();
    let severity: Severity = "info";
    for (const id of screen.issueIds) {
      const issue = issueById.get(id);
      if (!issue) continue;
      if (SEVERITY_RANK[issue.severity] > SEVERITY_RANK[severity]) severity = issue.severity;
      const cat = categoryOf(issue);
      const arr = byCat.get(cat) ?? [];
      arr.push({ issue, description: describe(issue) });
      byCat.set(cat, arr);
    }

    const groups = [...byCat.entries()]
      .map(([title, items]) => ({ title, items }))
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.title) - CATEGORY_ORDER.indexOf(b.title));

    views.push({
      screenId: screen.id,
      screenName: screen.name,
      severity,
      issueCount: screen.issueCount,
      groups,
    });
  }
  return views;
}
