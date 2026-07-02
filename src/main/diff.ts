import type { Issue, Report, ScanDiff } from "../shared/types";

export interface DiffOutcome {
  diff: ScanDiff;
  resolvedIssues: Issue[];
}

/**
 * Compare the previous scan to the current one by stable issue id (`nodeId:checkId`).
 * Mutates `curr` in place: stamps each current issue's `status` and annotates each
 * current root cause with how many of its members were resolved. Returns the diff
 * counts plus the resolved issues (which are absent from `curr.issues`).
 */
export function diffReports(prev: Report, curr: Report): DiffOutcome {
  const prevIds = new Set(prev.issues.map((i) => i.id));
  const currIds = new Set(curr.issues.map((i) => i.id));

  let newCount = 0;
  let unchangedCount = 0;
  for (const issue of curr.issues) {
    if (prevIds.has(issue.id)) {
      issue.status = "unchanged";
      unchangedCount++;
    } else {
      issue.status = "new";
      newCount++;
    }
  }

  const resolvedIssues: Issue[] = [];
  for (const issue of prev.issues) {
    if (!currIds.has(issue.id)) resolvedIssues.push({ ...issue, status: "resolved" });
  }

  // Root-cause diff: for each surviving cause, how many of last scan's members are gone.
  const prevCauseById = new Map(prev.rootCauses.map((c) => [c.id, c]));
  for (const cause of curr.rootCauses) {
    const before = prevCauseById.get(cause.id);
    if (!before) continue;
    const currSet = new Set(cause.issueIds);
    cause.previousIssueCount = before.issueCount;
    cause.resolvedCount = before.issueIds.filter((id) => !currSet.has(id)).length;
  }

  // Screen diff: per-screen progress since the previous scan.
  const prevScreenById = new Map((prev.screens ?? []).map((s) => [s.id, s]));
  for (const screen of curr.screens) {
    const before = prevScreenById.get(screen.id);
    if (!before) continue;
    const currSet = new Set(screen.issueIds);
    screen.previousIssueCount = before.issueCount;
    screen.resolvedCount = before.issueIds.filter((id) => !currSet.has(id)).length;
  }

  return {
    diff: { resolved: resolvedIssues.length, new: newCount, unchanged: unchangedCount },
    resolvedIssues,
  };
}
