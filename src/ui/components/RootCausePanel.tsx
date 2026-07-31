import { useState } from "react";
import type { CheckId, Issue, RootCause } from "../../shared/types";

const SEEN_LIMIT = 3;

// Softer reach copy: "Fix once, improves 6 screens" → "One update improves 6 screens".
const oneUpdate = (impact: string) => impact.replace(/fix once,?\s*/i, "One update ");

// Native-inspector shape. Face = decide-fast only: recommendation, one-line description, reach,
// and the primary action (jump to component). Everything else (why it works, where it appears,
// reveal) sits behind "Why?". "Appears in" links back to the Screen view (the two-way link).
export function RootCausePanel({
  rootCauses,
  issueById,
  revealingCauseId,
  onReveal,
  onExitReveal,
  onGoToComponent,
  onOpenScreen,
}: {
  rootCauses: RootCause[];
  issueById: Map<string, Issue>;
  revealingCauseId: string | null;
  onReveal: (causeId: string, checkId: CheckId, nodeIds: string[]) => void;
  onExitReveal: () => void;
  onGoToComponent: (componentId: string) => void;
  onOpenScreen: (frameId: string) => void;
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
        // Where it appears — unique screens, navigable back to the Screen view.
        const seen = new Set<string>();
        const appears: { frameId: string; name: string }[] = [];
        for (const m of members) {
          if (m.frameId && !seen.has(m.frameId)) {
            seen.add(m.frameId);
            appears.push({ frameId: m.frameId, name: m.frameName ?? m.pageName ?? "Screen" });
          }
        }
        const revealing = revealingCauseId === rc.id;

        return (
          <div key={rc.id} style={styles.card}>
            <div style={styles.face}>
              <div style={styles.kicker}>{fix.pattern}</div>
              <div style={styles.title}>{fix.title}</div>
              <div style={styles.desc}>{fix.description}</div>
              <div style={styles.metaRow}>
                <span style={styles.impact}>{oneUpdate(fix.expectedImpact)}</span>
                <button style={styles.whyToggle} onClick={() => setExpandedId(open ? null : rc.id)}>
                  {open ? "Hide" : "Why?"}
                </button>
              </div>
              {resolved && <div style={styles.verify}>{rc.resolvedCount} fixed since last check</div>}
              <div style={styles.actions}>
                <button
                  className="lpt-reveal-link"
                  onClick={() => (revealing ? onExitReveal() : onReveal(rc.id, dominant, nodeIds))}
                >
                  {revealing ? "Hide" : <><span aria-hidden="true">◎</span> Reveal</>}
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

            {open && (
              <div style={styles.expanded}>
                <div style={styles.row}>
                  <span style={styles.rowLabel}>Why this works</span>
                  <span style={styles.rowValue}>{fix.justification}</span>
                </div>
                {appears.length > 0 && (
                  <div style={styles.row}>
                    <span style={styles.rowLabel}>Appears in</span>
                    <span style={styles.chips}>
                      {appears.slice(0, SEEN_LIMIT).map((a) => (
                        <button
                          key={a.frameId}
                          style={styles.chip}
                          onClick={() => onOpenScreen(a.frameId)}
                          title="Open this screen"
                        >
                          {a.name}
                        </button>
                      ))}
                      {appears.length > SEEN_LIMIT && (
                        <span style={styles.more}>+{appears.length - SEEN_LIMIT} more</span>
                      )}
                    </span>
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
  face: { display: "flex", flexDirection: "column", gap: 6, padding: "14px 4px" },
  kicker: {
    fontSize: 10,
    fontWeight: 600,
    opacity: 0.5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: { fontSize: 14, fontWeight: 600, lineHeight: 1.3 },
  desc: { fontSize: 12, color: "var(--figma-color-text-secondary, #7a7a7a)", lineHeight: 1.45 },
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
  actions: { display: "flex", alignItems: "center", gap: 12, marginTop: 4 },
  expanded: { display: "flex", flexDirection: "column", gap: 10, padding: "0 4px 16px" },
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
  chips: { display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0 },
  chip: {
    fontSize: 11,
    fontWeight: 500,
    padding: "2px 8px",
    borderRadius: 6,
    border: "1px solid var(--figma-color-border, #d9d9d9)",
    background: "transparent",
    color: "var(--figma-color-text-brand, #0d99ff)",
    cursor: "pointer",
  },
  more: { fontSize: 11, opacity: 0.5, alignSelf: "center" },
};
