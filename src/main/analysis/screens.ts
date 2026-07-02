import type { Issue, ScreenSummary } from "../../shared/types";
import { impactBand } from "../../shared/impact";

/** Metadata for every screen that was scanned — including clean ones (0 issues). */
export interface ScannedScreen {
  name: string;
  pageId: string;
  pageName: string;
}

export interface ScreensResult {
  screens: ScreenSummary[];
  affectedScreens: number;
  cleanScreens: number;
}

/**
 * One ScreenSummary per scanned screen. `scannedScreens` is the source of truth for
 * which screens existed in scope, so screens with zero issues still appear (clean ✓).
 */
export function buildScreens(
  issues: Issue[],
  scannedScreens: Map<string, ScannedScreen>,
): ScreensResult {
  const byFrame = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!issue.frameId) continue;
    const arr = byFrame.get(issue.frameId) ?? [];
    arr.push(issue);
    byFrame.set(issue.frameId, arr);
  }

  const screens: ScreenSummary[] = [];
  for (const [frameId, info] of scannedScreens) {
    const members = byFrame.get(frameId) ?? [];
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const m of members) {
      const band = impactBand(m.impactScore);
      if (band === "high") high++;
      else if (band === "medium") medium++;
      else low++;
    }
    screens.push({
      id: frameId,
      name: info.name,
      pageId: info.pageId,
      pageName: info.pageName,
      issueCount: members.length,
      highImpact: high,
      mediumImpact: medium,
      lowImpact: low,
      impactScore: members.reduce((sum, m) => sum + m.impactScore, 0),
      issueIds: members.map((m) => m.id),
    });
  }

  screens.sort((a, b) => b.impactScore - a.impactScore);
  return {
    screens,
    affectedScreens: screens.filter((s) => s.issueCount > 0).length,
    cleanScreens: screens.filter((s) => s.issueCount === 0).length,
  };
}
