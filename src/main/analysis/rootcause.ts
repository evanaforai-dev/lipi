import type { CheckId, Issue, ReportSummary, RootCause } from "../../shared/types";
import { CHECK_LABEL } from "../../shared/constants";
import { impactBand } from "../../shared/impact";
import { suggestFix } from "../../shared/fix";

const distinctScreens = (issues: Issue[]): number =>
  new Set(issues.map((i) => i.frameId).filter((f): f is string => !!f)).size;

function makeCause(id: string, title: string, group: Issue[]): RootCause {
  const nodes = new Set(group.map((i) => i.nodeId));
  const components = new Set(
    group.map((i) => i.componentId).filter((c): c is string => !!c),
  );

  // Evidence: issue-type breakdown, biggest contributor first.
  const counts = new Map<CheckId, number>();
  for (const i of group) counts.set(i.checkId, (counts.get(i.checkId) ?? 0) + 1);
  const evidence = [...counts.entries()]
    .map(([checkId, count]) => ({ checkId, count }))
    .sort((a, b) => b.count - a.count);

  // Fix Engine: derive a remedy from the dominant check + its modal layout context.
  const dominant = evidence[0].checkId;
  const dominantIssues = group.filter((i) => i.checkId === dominant);
  let fixedWidth = 0;
  let autoLayout = 0;
  for (const i of dominantIssues) {
    if (i.fixContext === "fixed-width") fixedWidth++;
    else if (i.fixContext === "auto-layout") autoLayout++;
  }
  const fixContext =
    fixedWidth === 0 && autoLayout === 0
      ? undefined
      : fixedWidth >= autoLayout
        ? "fixed-width"
        : "auto-layout";

  return {
    id,
    title,
    issueCount: group.length,
    affectedNodes: nodes.size,
    affectedComponents: components.size,
    impactScore: group.reduce((sum, i) => sum + i.impactScore, 0),
    issueIds: group.map((i) => i.id),
    affectedScreens: distinctScreens(group),
    evidence,
    suggestedFix: suggestFix({
      checkId: dominant,
      fixContext,
      isComponent: id.startsWith("component:"),
      resolvesIssues: dominantIssues.length,
      resolvesScreens: distinctScreens(dominantIssues),
      totalIssues: group.length,
    }),
  };
}

/**
 * Two lenses on the same issues, so a designer can attack the biggest lever first:
 *   • by Component — "fixing Button resolves 27 issues"
 *   • by Check type — "fixing Overflow resolves 18 issues"
 * An issue contributes to both lenses; root causes are an overlay, not a partition.
 */
export function buildRootCauses(issues: Issue[]): RootCause[] {
  const byComponent = new Map<string, Issue[]>();
  const byCheck = new Map<CheckId, Issue[]>();

  for (const issue of issues) {
    if (issue.componentId) {
      const arr = byComponent.get(issue.componentId) ?? [];
      arr.push(issue);
      byComponent.set(issue.componentId, arr);
    }
    const carr = byCheck.get(issue.checkId) ?? [];
    carr.push(issue);
    byCheck.set(issue.checkId, carr);
  }

  const causes: RootCause[] = [];
  for (const [componentId, group] of byComponent) {
    const name = group.find((g) => g.componentName)?.componentName ?? "Component";
    causes.push(makeCause(`component:${componentId}`, name, group));
  }
  for (const [checkId, group] of byCheck) {
    causes.push(makeCause(`check:${checkId}`, CHECK_LABEL[checkId], group));
  }

  causes.sort((a, b) => b.impactScore - a.impactScore);
  return causes;
}

export function buildSummary(issues: Issue[]): ReportSummary {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const i of issues) {
    const band = impactBand(i.impactScore);
    if (band === "high") high++;
    else if (band === "medium") medium++;
    else low++;
  }
  const components = new Set(
    issues.map((i) => i.componentId).filter((c): c is string => !!c),
  );
  return {
    totalIssues: issues.length,
    highImpact: high,
    mediumImpact: medium,
    lowImpact: low,
    affectedComponents: components.size,
  };
}
