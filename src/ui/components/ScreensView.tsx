import { useState } from "react";
import type { CheckId } from "../../shared/types";
import type { ScreenView } from "../screenViewModel";

// Screen-first review. Collapsed rows summarise WHAT is wrong (category names + a soft status),
// not how many. Expanding groups issues by type, each with a prominent recommendation and a
// Reveal action. Pure view over the frozen Report — see screenViewModel.ts.
export function ScreensView({
  views,
  onReveal,
}: {
  views: ScreenView[];
  onReveal: (checkId: CheckId, nodeIds: string[]) => void;
}) {
  // Collapsed by default: the summary list is the first thing you read, drill in on demand.
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div style={styles.list}>
      {views.map((screen) => {
        const open = screen.hasIssues && openId === screen.screenId;
        return (
          <div key={screen.screenId} style={styles.screen}>
            <button
              style={styles.head}
              onClick={() => screen.hasIssues && setOpenId(open ? null : screen.screenId)}
              disabled={!screen.hasIssues}
            >
              <span style={styles.headText}>
                <span style={styles.name}>{screen.screenName}</span>
                <span style={styles.summary}>{screen.summary}</span>
              </span>
              <span
                style={{ ...styles.status, ...(screen.hasIssues ? styles.statusAttn : styles.statusClear) }}
              >
                {screen.status}
              </span>
              {screen.hasIssues && <span style={styles.chevron}>{open ? "⌄" : "›"}</span>}
            </button>

            {open && (
              <div style={styles.detail}>
                {screen.groups.map((group) => (
                  <section key={group.checkId} style={styles.group}>
                    <div style={styles.groupHead}>
                      <span style={styles.category}>{group.category}</span>
                      <span style={styles.affected}>
                        {group.items.length} affected layer{group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p style={styles.recommendation}>{group.recommendation}</p>
                    <button
                      style={styles.revealPrimary}
                      onClick={() => onReveal(group.checkId, group.nodeIds)}
                    >
                      Reveal instances
                    </button>

                    <div style={styles.rows}>
                      {group.items.map(({ issue, problem }) => (
                        <div key={issue.id} style={styles.row}>
                          <span style={styles.rowText}>
                            <span style={styles.layer} title={issue.nodeName}>
                              {issue.nodeName}
                            </span>
                            <span style={styles.problem}>{problem}</span>
                          </span>
                          <button
                            style={styles.revealGhost}
                            onClick={() => onReveal(issue.checkId, [issue.nodeId])}
                          >
                            Reveal
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "flex", flexDirection: "column" },
  screen: { borderBottom: "1px solid var(--figma-color-border, #ececec)" },
  head: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "14px 4px",
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
  },
  headText: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0, flex: 1 },
  name: { fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  summary: {
    fontSize: 11,
    opacity: 0.55,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  status: { fontSize: 11, fontWeight: 500, flex: "0 0 auto" },
  statusAttn: { color: "var(--figma-color-text-warning, #b76e00)" },
  statusClear: { color: "var(--figma-color-text-success, #338a4d)", opacity: 0.8 },
  chevron: { fontSize: 14, opacity: 0.4, flex: "0 0 auto", width: 10, textAlign: "center" },
  detail: { display: "flex", flexDirection: "column", gap: 20, padding: "4px 4px 20px" },
  group: { display: "flex", flexDirection: "column", gap: 6 },
  groupHead: { display: "flex", alignItems: "baseline", gap: 8 },
  category: { fontSize: 12, fontWeight: 600 },
  affected: { fontSize: 11, opacity: 0.5 },
  recommendation: { fontSize: 12.5, lineHeight: 1.45, margin: 0, opacity: 0.9 },
  revealPrimary: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: 600,
    padding: "6px 14px",
    borderRadius: 7,
    border: "none",
    background: "var(--figma-color-bg-brand, #0d99ff)",
    color: "var(--figma-color-text-onbrand, #fff)",
    cursor: "pointer",
    marginTop: 2,
  },
  rows: { display: "flex", flexDirection: "column", marginTop: 6 },
  row: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0" },
  rowText: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 },
  layer: { fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  problem: { fontSize: 11, opacity: 0.6, lineHeight: 1.4 },
  revealGhost: {
    flex: "0 0 auto",
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "var(--figma-color-text-brand, #0d99ff)",
    fontWeight: 600,
    cursor: "pointer",
  },
};
