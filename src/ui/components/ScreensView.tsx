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
          <section key={screen.screenId} className="lpt-card" style={styles.card}>
            <button
              style={styles.head}
              onClick={() => setOpenId(open ? null : screen.screenId)}
              title={open ? "Collapse" : "Show findings"}
            >
              <span style={styles.name}>{screen.screenName}</span>
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

            {open ? (
              <div className="lpt-reveal" style={styles.findings}>
                {screen.findings.map(({ issue, title, explanation }) => (
                  <div key={issue.id} style={styles.finding}>
                    <span style={styles.findingTitle}>{title}</span>
                    <span style={styles.findingText}>{explanation}</span>
                    <button
                      className="lpt-btn lpt-btn-primary lpt-btn-sm"
                      style={{ marginTop: 4 }}
                      onClick={() => onReveal(issue.checkId, [issue.nodeId])}
                    >
                      Reveal on Canvas
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <ul style={styles.preview}>
                {screen.findings.map(({ issue, title }) => (
                  <li key={issue.id} style={styles.previewItem}>
                    <span style={styles.bullet}>•</span>
                    {title}
                  </li>
                ))}
              </ul>
            )}

            <button
              className="lpt-btn lpt-btn-secondary lpt-btn-sm"
              style={{ alignSelf: "flex-start", marginTop: 2 }}
              onClick={() => onPreviewScreen(screen.screenId)}
            >
              Preview Screen
            </button>
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
  head: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: 0,
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
  },
  count: { fontSize: 12, opacity: 0.55, flex: "0 0 auto" },
  chevron: { fontSize: 15, opacity: 0.4, flex: "0 0 auto", width: 10, textAlign: "center" },
  preview: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 5 },
  previewItem: { display: "flex", gap: 8, fontSize: 12, opacity: 0.75, lineHeight: 1.4 },
  bullet: { flex: "0 0 auto", opacity: 0.5 },
  findings: { display: "flex", flexDirection: "column", gap: 14 },
  finding: { display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" },
  findingTitle: { fontSize: 13, fontWeight: 600 },
  findingText: { fontSize: 12, opacity: 0.7, lineHeight: 1.45 },
};
