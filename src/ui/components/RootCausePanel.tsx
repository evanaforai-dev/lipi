import { useState } from "react";
import type { CheckId, Issue, RootCause } from "../../shared/types";

const SEEN_LIMIT = 2;

// Softer reach copy: "Fix once, improves 6 screens" → "One update improves 6 screens".
const oneUpdate = (impact: string) => impact.replace(/fix once,?\s*/i, "One update ");

// THE product. The collapsed card alone answers what to fix, why, and what happens —
// no expansion required. Expanding only adds proof ("seen in") and actions.
export function RootCausePanel({
  rootCauses,
  issueById,
  revealingCauseId,
  onReveal,
  onExitReveal,
  onGoToComponent,
}: {
  rootCauses: RootCause[];
  issueById: Map<string, Issue>;
  revealingCauseId: string | null;
  onReveal: (causeId: string, checkId: CheckId, nodeIds: string[]) => void;
  onExitReveal: () => void;
  onGoToComponent: (componentId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (rootCauses.length === 0) return null;

  return (
    <section style={styles.panel}>
      {rootCauses.slice(0, 5).map((rc) => {
        const fix = rc.suggestedFix;
        const open = expandedId === rc.id;
        const resolved = rc.resolvedCount !== undefined && rc.resolvedCount > 0;
        const [kind, ...rest] = rc.id.split(":");
        const componentId = kind === "component" ? rest.join(":") : null;
        const dominant = rc.evidence[0]?.checkId ?? "overflow";
        const members = rc.issueIds.map((id) => issueById.get(id)).filter((i): i is Issue => !!i);
        const nodeIds = [...new Set(members.map((i) => i.nodeId))];
        const affects = [
          ...new Set(members.map((i) => i.frameName ?? i.pageName).filter((n): n is string => !!n)),
        ].slice(0, SEEN_LIMIT);
        // One representative path as proof — not navigable, not a list.
        const ex = members[0];
        const example = ex
          ? [...new Set([ex.frameName, ex.componentName, ex.nodeName].filter((p): p is string => !!p))].join(" → ")
          : null;
        const revealing = revealingCauseId === rc.id;

        return (
          <div key={rc.id} style={styles.card}>
            <button style={styles.face} onClick={() => setExpandedId(open ? null : rc.id)}>
              <div style={styles.kicker}>
                <span>{fix.pattern}</span>
                <span style={styles.caret}>{open ? "▾" : "▸"}</span>
              </div>
              <div style={styles.fix}>{fix.title}</div>
              <div style={styles.why}>{fix.description}</div>
              <div style={styles.impact}>{oneUpdate(fix.expectedImpact)}</div>
              {resolved && (
                <div style={styles.verify}>{rc.resolvedCount} fixed since last check</div>
              )}
            </button>

            {open && (
              <div style={styles.expanded}>
                <div style={styles.why_works}>
                  <span style={styles.affectsLabel}>Why this works</span>
                  <span style={styles.whyWorksText}>{fix.justification}</span>
                </div>
                {affects.length > 0 && (
                  <div style={styles.affects}>
                    <span style={styles.affectsLabel}>Affects</span>
                    <span style={styles.affectsItems}>{affects.join(", ")}</span>
                  </div>
                )}
                {example && (
                  <div style={styles.affects}>
                    <span style={styles.affectsLabel}>Example</span>
                    <span style={styles.affectsItems}>{example}</span>
                  </div>
                )}
                <div style={styles.actions}>
                  <button
                    className="lpt-btn lpt-btn-primary lpt-btn-sm"
                    onClick={() => (revealing ? onExitReveal() : onReveal(rc.id, dominant, nodeIds))}
                  >
                    {revealing ? "Hide" : "Reveal on Canvas"}
                  </button>
                  {componentId && (
                    <button
                      className="lpt-btn lpt-btn-secondary lpt-btn-sm"
                      onClick={() => onGoToComponent(componentId)}
                    >
                      Go to component
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: { display: "flex", flexDirection: "column", margin: "4px 0 8px" },
  card: { borderBottom: "1px solid var(--figma-color-border, #ececec)" },
  face: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    width: "100%",
    textAlign: "left",
    padding: "18px 4px",
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
  },
  kicker: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 11,
    fontWeight: 600,
    opacity: 0.6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  caret: { fontSize: 10, opacity: 0.7 },
  fix: { fontSize: 15, fontWeight: 700, lineHeight: 1.25 },
  why: { fontSize: 12, opacity: 0.75, lineHeight: 1.4 },
  impact: { fontSize: 12, fontWeight: 600, marginTop: 1 },
  confidence: { fontSize: 10, opacity: 0.45, letterSpacing: 0.2 },
  verify: { fontSize: 11, color: "#2f9e44", opacity: 0.9, marginTop: 1 },
  expanded: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "0 4px 18px",
  },
  why_works: { display: "flex", flexDirection: "column", gap: 2 },
  whyWorksText: { fontSize: 12, opacity: 0.85, lineHeight: 1.45 },
  affects: { display: "flex", gap: 8, alignItems: "baseline" },
  affectsLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.5 },
  affectsItems: { fontSize: 11, opacity: 0.7 },
  actions: { display: "flex", gap: 8 },
};
