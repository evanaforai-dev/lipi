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

  const summarize = (
    frameId: string,
    members: Issue[],
    info?: ScannedScreen,
  ): ScreenSummary => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const m of members) {
      const band = impactBand(m.impactScore);
      if (band === "high") high++;
      else if (band === "medium") medium++;
      else low++;
    }
    // Screen identity comes from the issues themselves (stamped from the ORIGINAL node in
    // assemble) and falls back to the scanned-screen record — never the other way round.
    const ex = members[0];
    return {
      id: frameId,
      name: info?.name ?? ex?.frameName ?? "Frame",
      pageId: info?.pageId ?? ex?.pageId ?? "",
      pageName: info?.pageName ?? ex?.pageName ?? "",
      issueCount: members.length,
      highImpact: high,
      mediumImpact: medium,
      lowImpact: low,
      impactScore: members.reduce((sum, m) => sum + m.impactScore, 0),
      issueIds: members.map((m) => m.id),
    };
  };

  const screens: ScreenSummary[] = [];
  const seen = new Set<string>();

  // Affected screens — grouped straight from the issues' own frameId, so counts never depend
  // on the scanned-screen keys lining up with the (clone → original) remap.
  for (const [frameId, members] of byFrame) {
    seen.add(frameId);
    screens.push(summarize(frameId, members, scannedScreens.get(frameId)));
  }

  // Clean screens — scanned but with no issues of their own.
  for (const [frameId, info] of scannedScreens) {
    if (seen.has(frameId)) continue;
    screens.push(summarize(frameId, [], info));
  }

  screens.sort((a, b) => b.impactScore - a.impactScore);
  return {
    screens,
    affectedScreens: screens.filter((s) => s.issueCount > 0).length,
    cleanScreens: screens.filter((s) => s.issueCount === 0).length,
  };
}
