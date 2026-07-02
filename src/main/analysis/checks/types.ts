import type { Issue, ScriptId } from "../../../shared/types";
import type { TextSnapshot } from "../../traverse";

// Every check is a pure function: a snapshot + its detected scripts → an Issue or null.
export type Check = (snap: TextSnapshot, scripts: ScriptId[]) => Issue | null;

/** Helper to build an Issue with the stable `${nodeId}:${checkId}` id. */
export function issue(
  snap: TextSnapshot,
  scripts: ScriptId[],
  checkId: Issue["checkId"],
  severity: Issue["severity"],
  message: string,
  detail?: string,
): Issue {
  return {
    id: `${snap.nodeId}:${checkId}`,
    checkId,
    severity,
    nodeId: snap.nodeId,
    nodeName: snap.nodeName,
    scripts,
    message,
    detail,
    impactScore: 0, // placeholder — analyzeSelection() computes the real score post-decoration
  };
}
