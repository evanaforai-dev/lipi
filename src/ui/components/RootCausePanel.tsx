import { useState } from "react";
import type { CheckId, Issue, RootCause } from "../../shared/types";

const SEEN_LIMIT = 2;

// Softer reach copy: "Fix once, improves 6 screens" → "One update improves 6 screens".
const oneUpdate = (impact: string) => impact.replace(/fix once,?\s*/i, "One update ");

// Native-inspector shape: the always-visible face answers "what to do", "how much it helps",
// and offers the two actions (jump to component, reveal) — no reading required. The evidence
// (explanation, why it works, affects, example) sits behind a single "Why?" disclosure.
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
        const ex = members[0];
        const example = ex
          ? [...new Set([ex.frameName, ex.componentName, ex.nodeName].filter((p): p is string => !!p))].join(" → ")
          : null;
        const revealing = revealingCauseId === rc.id;

        return (
          <div key={rc.id} style={styles.card}>
            <div style={styles.face}>
              <div style={styles.kicker}>{fix.pattern}</div>
              <div style={styles.title}>{fix.title}</div>
              <div style={styles.metaRow}>
                <span style={styles.impact}>{oneUpdate(fix.expectedImpact)}</span>
                <button
                  style={styles.whyToggle}
                  onClick={() => setExpandedId(open ? null : rc.id)}
                >
                  {open ? "Hide" : "Why?"}
                </button>
              </div>
              {resolved && <div style={styles.verify}>{rc.resolvedCount} fixed since last check</div>}

              <div style={styles.actions}>
                {componentId && (
                  <button
                    className="lpt-btn lpt-btn-secondary lpt-btn-sm"
                    onClick={() => onGoToComponent(componentId)}
                  >
                    Go to component
                  </button>
                )}
                <button
                  className="lpt-reveal-link"
                  onClick={() => (revealing ? onExitReveal() : onReveal(rc.id, dominant, nodeIds))}
                >
                  {revealing ? "Hide" : <><span aria-hidden="true">◎</span> Reveal</>}
                </button>
              </div>
            </div>

            {open && (
              <div style={styles.expanded}>
                <p style={styles.explain}>{fix.description}</p>
                <div style={styles.row}>
                  <span style={styles.rowLabel}>Why this works</span>
                  <span style={styles.rowValue}>{fix.justification}</span>
                </div>
                {affects.length > 0 && (
                  <div style={styles.row}>
                    <span style={styles.rowLabel}>Affects</span>
                    <span style={styles.rowValue}>{affects.join(", ")}</span>
                  </div>
                )}
                {example && (
                  <div style={styles.row}>
                    <span style={styles.rowLabel}>Example</span>
                    <span style={styles.rowValue}>{example}</span>
                  </div>
                )}
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
    gap: 6,
    padding: "14px 4px",
  },
  kicker: {
    fontSize: 10,
    fontWeight: 600,
    opacity: 0.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: { fontSize: 14, fontWeight: 600, lineHeight: 1.3 },
  metaRow: { display: "flex", alignItems: "baseline", gap: 8 },
  impact: { fontSize: 12, opacity: 0.7, flex: 1, minWidth: 0 },
  whyToggle: {
    flex: "0 0 auto",
    fontSize: 11,
    fontWeight: 600,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "var(--figma-color-text-brand, #0d99ff)",
    cursor: "pointer",
  },
  verify: { fontSize: 11, color: "#2f9e44", opacity: 0.9 },
  actions: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 },
  expanded: { display: "flex", flexDirection: "column", gap: 10, padding: "0 4px 16px" },
  explain: {
    fontSize: 12,
    color: "var(--figma-color-text-secondary, #7a7a7a)",
    lineHeight: 1.45,
    margin: 0,
  },
  row: { display: "flex", gap: 10, alignItems: "baseline" },
  rowLabel: {
    flex: "0 0 auto",
    width: 84,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.5,
  },
  rowValue: { fontSize: 11, opacity: 0.75, lineHeight: 1.45, minWidth: 0 },
};
