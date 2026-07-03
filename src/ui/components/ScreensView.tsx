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
          <section key={screen.screenId} style={styles.card}>
            <button
              style={styles.head}
              onClick={() => setOpenId(open ? null : screen.screenId)}
              title={open ? "Collapse" : "Show findings"}
            >
              <span style={styles.name}>{screen.screenName}</span>
              <span style={styles.count}>
                {screen.findingCount} finding{screen.findingCount === 1 ? "" : "s"}
              </span>
              <span style={styles.chevron}>{open ? "⌄" : "›"}</span>
            </button>

            {open ? (
              <div style={styles.findings}>
                {screen.findings.map(({ issue, title, explanation }) => (
                  <div key={issue.id} style={styles.finding}>
                    <span style={styles.findingTitle}>{title}</span>
                    <span style={styles.findingText}>{explanation}</span>
                    <button
                      style={styles.reveal}
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

            <button style={styles.previewBtn} onClick={() => onPreviewScreen(screen.screenId)}>
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
    borderRadius: 10,
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
  previewItem: { display: "flex", gap: 8, fontSize: 12.5, opacity: 0.75, lineHeight: 1.4 },
  bullet: { flex: "0 0 auto", opacity: 0.5 },
  findings: { display: "flex", flexDirection: "column", gap: 14 },
  finding: { display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" },
  findingTitle: { fontSize: 13, fontWeight: 600 },
  findingText: { fontSize: 12, opacity: 0.7, lineHeight: 1.45 },
  reveal: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 12px",
    borderRadius: 7,
    border: "none",
    background: "var(--figma-color-bg-brand, #0d99ff)",
    color: "var(--figma-color-text-onbrand, #fff)",
    cursor: "pointer",
  },
  previewBtn: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: 600,
    padding: "6px 12px",
    borderRadius: 7,
    border: "1px solid var(--figma-color-border, #d5d5d5)",
    background: "var(--figma-color-bg, #fff)",
    color: "inherit",
    cursor: "pointer",
    marginTop: 2,
  },
};
