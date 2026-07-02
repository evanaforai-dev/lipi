import type { CheckId, Confidence, SuggestedFix } from "./types";

// Deterministic, rule-based fix suggestions — no AI. The dominant check (the top
// contributor in a root cause's evidence) plus its layout context selects the rule.

export interface FixInput {
  checkId: CheckId; // dominant check
  fixContext?: "fixed-width" | "auto-layout"; // only meaningful for overflow
  isComponent: boolean; // root cause is a component instance (vs a raw container)
  resolvesIssues: number; // issues this fix addresses (dominant check only)
  resolvesScreens: number; // distinct screens among those issues
  totalIssues: number; // whole root cause — used to gauge confidence
}

// Deterministic pattern name from dominant check + layout context. The product talks
// in reusable system patterns, never component names.
function patternName(
  checkId: CheckId,
  fixContext: FixInput["fixContext"],
  isComponent: boolean,
): string {
  switch (checkId) {
    case "overflow":
      if (fixContext === "auto-layout") return "CONTENT CONSTRAINTS";
      return isComponent ? "FIXED-WIDTH BUTTONS" : "CONSTRAINED CONTAINERS";
    case "line-clip":
      return "TIGHT LINE HEIGHTS";
    case "small-indic":
      return "UNDERSIZED LOCALIZED TYPE";
    case "missing-font":
      return "UNSUPPORTED FONT STACKS";
  }
}

// Design-system reasoning for why THIS fix is the right one. Reads like senior-designer
// advice — outcomes, not implementation mechanics. Deterministic per check + context.
function justificationSentence(checkId: CheckId, fixContext: FixInput["fixContext"]): string {
  switch (checkId) {
    case "overflow":
      if (fixContext === "auto-layout")
        return "Creates room for longer translations without requiring text-size changes.";
      if (fixContext === "fixed-width")
        return "Removes the width constraint while preserving the component's existing layout behavior.";
      return "Gives longer translations the space they need without shrinking the text.";
    case "line-clip":
      return "Prevents clipping without changing content length or component structure.";
    case "small-indic":
      return "Improves readability without requiring layout changes.";
    case "missing-font":
      return "Preserves the existing design while ensuring the required glyphs can render.";
  }
}

export function suggestFix(input: FixInput): SuggestedFix {
  let title = "";
  let description = "";
  let base: Confidence = "medium";

  switch (input.checkId) {
    case "overflow":
      if (input.fixContext === "auto-layout") {
        title = "Allow the container to grow";
        description = "The container can't grow, so longer translations get clipped.";
        base = "high";
      } else if (input.fixContext === "fixed-width") {
        title = "Convert fixed width to Hug Contents";
        description = "Translations run wider than the available space.";
        base = "high";
      } else {
        title = "Let text resize or widen the container";
        description = "Localized text is exceeding the available width.";
        base = "medium";
      }
      break;
    case "line-clip":
      title = "Increase line height to a safe range";
      description = "Lines are too tight, clipping the tops and bottoms of letters.";
      base = "high";
      break;
    case "small-indic":
      title = "Increase the minimum text size";
      description = "The text is too small to stay legible in this script.";
      base = "high";
      break;
    case "missing-font":
      title = "Add language support to the font stack";
      description = "The font can't display this script, so text may render as boxes.";
      base = "medium"; // detection is heuristic; font changes are a judgement call
      break;
  }

  // Reach language — screens propagate further than issue totals.
  const expectedImpact =
    input.resolvesScreens > 0
      ? `Fix once, improves ${input.resolvesScreens} screen${input.resolvesScreens === 1 ? "" : "s"}`
      : `Fix once, resolves ${input.resolvesIssues} issue${input.resolvesIssues === 1 ? "" : "s"}`;

  // A single fix can't clear a cause where the dominant check is a minority.
  const share = input.totalIssues > 0 ? input.resolvesIssues / input.totalIssues : 1;
  const confidence: Confidence = base === "high" && share < 0.6 ? "medium" : base;

  return {
    pattern: patternName(input.checkId, input.fixContext, input.isComponent),
    title,
    justification: justificationSentence(input.checkId, input.fixContext),
    description,
    expectedImpact,
    confidence,
  };
}
