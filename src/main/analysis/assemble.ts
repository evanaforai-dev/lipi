import type { Issue, Report, Severity } from "../../shared/types";
import { computeImpactScore } from "../../shared/impact";
import { buildInstanceCountMap, getComponentInfo } from "../component";
import { getScreenInfo } from "../screen";
import { buildRootCauses, buildSummary } from "./rootcause";
import { buildScreens, type ScannedScreen } from "./screens";

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export interface ReportMetadata {
  scanId: string;
  createdAt: number;
  scannedNodes: number;
  scannedScreens: Map<string, ScannedScreen>; // every scanned screen, so clean ones appear
}

/**
 * The stable seam: raw Issues (from ANY detector) → finished Report.
 * Decorates each issue with component + screen identity and its impact score, then
 * aggregates. The static checks feed this today; the Delta Engine will feed the same
 * function next — nothing downstream (root causes, fixes, ranking, UI) changes.
 *
 * Ordering is deliberate and matches the pre-extraction behavior exactly:
 *   • buildScreens runs on UNSORTED issues (screen.issueIds keep push order)
 *   • buildRootCauses / buildSummary run on SORTED issues
 */
export function assembleReport(issues: Issue[], metadata: ReportMetadata): Report {
  const instanceCounts = buildInstanceCountMap();

  for (const issue of issues) {
    const node = figma.getNodeById(issue.nodeId);
    if (node) {
      // Attach component context so the UI can offer "Go To Component".
      const component = getComponentInfo(node, instanceCounts);
      if (component) {
        issue.componentId = component.componentId;
        issue.componentName = component.componentName;
        issue.instanceCount = component.instanceCount;
      }
      // Attach screen identity (Screen Intelligence).
      const screen = getScreenInfo(node);
      issue.pageId = screen.pageId;
      issue.pageName = screen.pageName;
      issue.frameId = screen.frameId;
      issue.frameName = screen.frameName;
    }
    // Deterministic priority: severity weight × component reach.
    issue.impactScore = computeImpactScore(issue.severity, issue.instanceCount);
  }

  const screenResult = buildScreens(issues, metadata.scannedScreens);

  // Highest impact first; severity breaks ties so equal-reach errors lead.
  issues.sort(
    (a, b) =>
      b.impactScore - a.impactScore || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );

  return {
    scope: "selection",
    scanId: metadata.scanId,
    createdAt: metadata.createdAt,
    scannedNodes: metadata.scannedNodes,
    issues,
    summary: buildSummary(issues),
    rootCauses: buildRootCauses(issues),
    screens: screenResult.screens,
    affectedScreens: screenResult.affectedScreens,
    cleanScreens: screenResult.cleanScreens,
  };
}
