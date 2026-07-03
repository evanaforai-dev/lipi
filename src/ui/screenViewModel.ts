import type { CheckId, Issue, Report } from "../shared/types";

// PRESENTATION LAYER ONLY. Reshapes the frozen Report into a screen-first review model:
// each screen carries a flat list of findings in plain design language — no engine categories,
// scores, or severity. Nothing in analysis changes; every finding references the existing Issue.

// Coarse, plain type labels for the collapsed one-line summary (scan, don't read).
const TYPE_LABEL: Record<CheckId, string> = {
  overflow: "Overflow",
  "small-indic": "Small text",
  "line-clip": "Clipping",
  "missing-font": "Font support",
};
const TYPE_ORDER: CheckId[] = ["overflow", "small-indic", "line-clip", "missing-font"];

export interface Finding {
  issue: Issue;
  title: string; // short plain-language headline, e.g. "Continue button wrapped"
  explanation: string; // one sentence of what happens after localization
}
export interface ScreenView {
  screenId: string;
  screenName: string;
  findingCount: number;
  typeSummary: string; // "Overflow · Small text" — the distinct problem types, for the collapsed row
  findings: Finding[];
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven"];
const word = (s: string) => WORDS[Number(s)] ?? s;
const firstPx = (s: string) => /(\d+)\s*px/.exec(s)?.[1] ?? null;

/** Short, plain headline for a finding: "<layer> <what happened>". No engine terms. */
export function titleFor(issue: Issue): string {
  const node = issue.nodeName;
  const msg = issue.message;
  switch (issue.checkId) {
    case "overflow":
      if (/wrapped/i.test(msg)) return `${node} wrapped`;
      if (/pushed nearby/i.test(msg)) return `${node} shifted after localization`;
      if (/screen grew/i.test(msg)) return `${node} grew taller`;
      if (/needed/i.test(msg)) return `${node} ran out of space`;
      if (/truncate/i.test(msg)) return `${node} clipped`;
      return `${node} overflowed`;
    case "small-indic":
      return `${node} text too small`;
    case "line-clip":
      return `${node} lines cramped`;
    case "missing-font":
      return `${node} font can't show this language`;
  }
}

/** One-sentence, plain explanation of a finding (no node name — the card shows the title). */
export function explain(issue: Issue): string {
  const msg = issue.message;
  const detail = issue.detail ?? "";
  switch (issue.checkId) {
    case "overflow": {
      if (/wrapped/i.test(msg)) {
        const m = /(\d+)\s*→\s*(\d+)\s*lines/.exec(detail);
        return m
          ? `The label wraps from ${word(m[1])} line to ${word(m[2])}.`
          : "The label wraps onto more lines after localization.";
      }
      if (/screen grew/i.test(msg)) return "The screen becomes taller after localization.";
      if (/pushed nearby/i.test(msg)) {
        const p = firstPx(msg);
        return p ? `It pushes nearby elements down by ${p}px.` : "It pushes nearby elements out of place.";
      }
      if (/needed/i.test(msg)) {
        const p = firstPx(msg);
        return p ? `It needs about ${p}px more room than it has.` : "It needs more room than it has.";
      }
      if (/truncate/i.test(msg)) return "The localized text is cut off.";
      {
        const p = firstPx(detail);
        return p ? `It spills about ${p}px past its container.` : "It spills past its container.";
      }
    }
    case "small-indic": {
      const now = firstPx(detail);
      const rec = /≥\s*(\d+)\s*px/.exec(detail)?.[1];
      return now && rec
        ? `At ${now}px it's below the ${rec}px needed to stay readable.`
        : "It's too small to read comfortably.";
    }
    case "line-clip":
      return "The lines sit too close, so tall characters may get clipped.";
    case "missing-font":
      return "The current font can't render this language.";
  }
}

export function buildScreenViews(report: Report, issueById: Map<string, Issue>): ScreenView[] {
  const views: ScreenView[] = [];
  for (const screen of report.screens) {
    if (screen.issueCount === 0) continue; // only screens that need review

    const findings: Finding[] = [];
    const types = new Set<CheckId>();
    for (const id of screen.issueIds) {
      const issue = issueById.get(id);
      if (!issue) continue;
      findings.push({ issue, title: titleFor(issue), explanation: explain(issue) });
      types.add(issue.checkId);
    }
    if (findings.length === 0) continue;

    views.push({
      screenId: screen.id,
      screenName: screen.name,
      findingCount: findings.length,
      typeSummary: TYPE_ORDER.filter((c) => types.has(c))
        .map((c) => TYPE_LABEL[c])
        .join(" · "),
      findings,
    });
  }
  return views;
}
