import type { Issue, Report } from "../shared/types";

// PRESENTATION LAYER ONLY. Transforms the frozen Report into a screen-first view model:
// one entry per analyzed screen (including clean ones), each with a flat list of its findings.
// Nothing in analysis changes — every item still references the existing Issue, and the
// descriptions are re-phrasings of the engine's own message strings (no new logic, no scores).

export interface ScreenItem {
  issue: Issue;
  description: string; // plain, factual design language (no engine terminology)
}

// Screen criticality is driven purely by how many problems a screen has — more problems, more
// critical. Deterministic thresholds, no AI. Colours are applied in the view (ScreensView).
export type ScreenLevel = "clear" | "low" | "medium" | "high" | "critical";
export function screenLevel(issueCount: number): ScreenLevel {
  if (issueCount === 0) return "clear";
  if (issueCount <= 2) return "low";
  if (issueCount <= 5) return "medium";
  if (issueCount <= 9) return "high";
  return "critical";
}

export interface ScreenView {
  screenId: string;
  screenName: string;
  issueCount: number;
  level: ScreenLevel; // count-based criticality band
  items: ScreenItem[]; // empty for clean screens
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
  // report.screens already contains every scanned screen (clean ones included), sorted worst
  // first. We keep that order and simply attach each screen's findings as a flat list.
  return report.screens.map((screen) => {
    const items: ScreenItem[] = [];
    for (const id of screen.issueIds) {
      const issue = issueById.get(id);
      if (!issue) continue;
      items.push({ issue, description: describe(issue) });
    }
    return {
      screenId: screen.id,
      screenName: screen.name,
      issueCount: screen.issueCount,
      level: screenLevel(screen.issueCount),
      items,
    };
  });
}
