import { useState } from "react";
import type { CheckId } from "../../shared/types";
import type { ScreenView } from "../screenViewModel";

// Screen-first review. A card per screen reads like a design-review note: the screen name, how
// many findings, and a preview of them. Expanding shows each finding in plain language with a
// Reveal action. No categories, scores, or severity. Pure view over the frozen Report.
export function ScreensView({
  views,
  onReveal,
  onPreviewScreen,
}: {
  views: ScreenView[];
  onReveal: (checkId: CheckId, nodeIds: string[]) => void;
  onPreviewScreen: (screenId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div style={styles.list}>
      {views.map((screen) => {
        const open = openId === screen.screenId;
        return (
          <section
            key={screen.screenId}
            className={`lpt-card${open ? " is-open" : ""}`}
            style={styles.card}
          >
            <div style={styles.head}>
              <button
                style={styles.headToggle}
                onClick={() => setOpenId(open ? null : screen.screenId)}
                title={open ? "Collapse" : "Show findings"}
              >
                <span style={styles.headText}>
                  <span style={styles.name}>{screen.screenName}</span>
                  {/* Collapsed: scan the problem TYPES, not every title. */}
                  {!open && <span style={styles.summary}>{screen.typeSummary}</span>}
                </span>
                <span style={styles.count}>
                  {screen.findingCount} finding{screen.findingCount === 1 ? "" : "s"}
                </span>
                <span
                  className="lpt-chevron"
                  style={{ ...styles.chevron, transform: open ? "rotate(90deg)" : "none" }}
                >
                  ›
                </span>
              </button>
              {/* Row action: revealed on hover (or when open) so the resting list stays quiet. */}
              <button
                className="lpt-btn lpt-btn-ghost lpt-btn-sm lpt-row-action"
                onClick={() => onPreviewScreen(screen.screenId)}
                title="Zoom to this screen on the canvas"
              >
                Preview
              </button>
            </div>

            {open && (
              <div className="lpt-reveal" style={styles.findings}>
                {screen.findings.map(({ issue, title, explanation }) => (
                  <div key={issue.id} style={styles.finding}>
                    <span style={styles.findingTitle}>{title}</span>
                    <span style={styles.findingText}>{explanation}</span>
                    <button
                      className="lpt-reveal-link"
                      onClick={() => onReveal(issue.checkId, [issue.nodeId])}
                    >
                      <span aria-hidden="true">◎</span> Reveal
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "flex", flexDirection: "column", gap: 14 },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "14px 14px 12px",
    borderRadius: 8,
    background: "var(--figma-color-bg-secondary, #f7f7f7)",
  },
  head: { display: "flex", alignItems: "center", gap: 8, width: "100%" },
  headToggle: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
  },
  headText: { display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 },
  name: {
    fontSize: 15,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  summary: {
    fontSize: 11,
    opacity: 0.55,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  count: { fontSize: 12, opacity: 0.55, flex: "0 0 auto" },
  chevron: { fontSize: 15, opacity: 0.4, flex: "0 0 auto", width: 10, textAlign: "center" },
  findings: { display: "flex", flexDirection: "column", gap: 14 },
  finding: { display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" },
  findingTitle: { fontSize: 13, fontWeight: 600 },
  findingText: { fontSize: 12, opacity: 0.7, lineHeight: 1.45 },
};
