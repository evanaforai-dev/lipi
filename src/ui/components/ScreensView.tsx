import { useEffect, useState } from "react";
import type { Issue } from "../../shared/types";
import type { ScreenLevel, ScreenView } from "../screenViewModel";

// Count-based criticality colours (more problems → more critical). Applied as a left band on
// the screen card plus a small uppercase tag, mirroring the "critical system" visual language.
const LEVEL: Record<ScreenLevel, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#e03e3e" },
  high: { label: "High", color: "#e8590c" },
  medium: { label: "Medium", color: "#d9822b" },
  low: { label: "Low", color: "#0d99ff" },
  clear: { label: "Clear", color: "#2f9e44" },
};

// Screen-first presentation: every analyzed screen is a row (clean ones included). Rows with
// findings expand into a flat "things to fix" list. Pure view over the frozen Report — see
// screenViewModel.ts. No scores, severity, or priority: only factual descriptions.
export function ScreensView({
  views,
  onShow,
}: {
  views: ScreenView[];
  onShow: (issue: Issue) => void;
}) {
  // Only the first screen with findings (worst — views are impact-sorted) is open by default.
  // Reset when a new report arrives (views identity changes only when the report does).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    const firstWithIssues = views.find((v) => v.issueCount > 0);
    setExpanded(new Set(firstWithIssues ? [firstWithIssues.screenId] : []));
  }, [views]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div style={styles.wrap}>
      <div style={styles.sectionHeading}>Screens</div>
      {views.map((screen) => {
        const hasIssues = screen.issueCount > 0;
        const isOpen = hasIssues && expanded.has(screen.screenId);
        const countLabel = hasIssues
          ? `${screen.issueCount} thing${screen.issueCount === 1 ? "" : "s"} to fix`
          : "0 issues";
        const level = LEVEL[screen.level];

        const header = (
          <>
            <span style={styles.screenName} title={screen.screenName}>
              {screen.screenName}
            </span>
            {hasIssues && (
              <span style={{ ...styles.levelTag, color: level.color }}>{level.label}</span>
            )}
            <span style={hasIssues ? styles.screenCount : styles.screenCountClean}>{countLabel}</span>
            {hasIssues && <span style={styles.chevron}>{isOpen ? "▼" : "▶"}</span>}
          </>
        );

        return (
          <section
            key={screen.screenId}
            style={{ ...styles.screen, borderLeft: `3px solid ${level.color}` }}
          >
            {hasIssues ? (
              <button
                style={styles.screenHead}
                onClick={() => toggle(screen.screenId)}
                title={isOpen ? "Collapse screen" : "Expand screen"}
              >
                {header}
              </button>
            ) : (
              <div style={styles.screenHeadStatic}>{header}</div>
            )}

            {isOpen && (
              <div style={styles.fixes}>
                <div style={styles.fixesHeading}>Things to fix ({screen.issueCount})</div>
                {screen.items.map(({ issue, description }, i) => (
                  <div
                    key={issue.id}
                    style={{ ...styles.item, ...(i > 0 ? styles.itemDivider : null) }}
                  >
                    <span style={styles.itemBody}>
                      <span style={styles.itemTitle} title={issue.nodeName}>
                        {issue.nodeName}
                      </span>
                      <span style={styles.itemDesc}>{description}</span>
                    </span>
                    <button
                      style={styles.show}
                      onClick={() => onShow(issue)}
                      title="Highlight this layer on the canvas"
                    >
                      Show
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

const headBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
};

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", flexDirection: "column", gap: 12 },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.6,
  },
  screen: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "10px 10px 8px",
    borderRadius: 8,
    border: "1px solid var(--figma-color-border, #e5e5e5)",
  },
  screenHead: { ...headBase, cursor: "pointer" },
  screenHeadStatic: { ...headBase, cursor: "default" },
  screenName: {
    fontSize: 12,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  levelTag: {
    marginLeft: "auto",
    flex: "0 0 auto",
    fontSize: 9,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  screenCount: { fontSize: 11, opacity: 0.6, flex: "0 0 auto" },
  screenCountClean: { fontSize: 11, opacity: 0.4, marginLeft: "auto", flex: "0 0 auto" },
  chevron: { fontSize: 9, opacity: 0.5, flex: "0 0 auto" },
  fixes: { display: "flex", flexDirection: "column" },
  fixesHeading: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.55,
    margin: "2px 0 4px",
  },
  item: { display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 2px" },
  itemDivider: { borderTop: "1px solid var(--figma-color-border, #ececec)" },
  itemBody: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 },
  itemTitle: { fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" },
  itemDesc: { fontSize: 11, lineHeight: 1.4, opacity: 0.8 },
  show: {
    flex: "0 0 auto",
    fontSize: 10,
    padding: "3px 10px",
    borderRadius: 5,
    border: "1px solid var(--figma-color-border, #ccc)",
    background: "var(--figma-color-bg, #fff)",
    color: "inherit",
    cursor: "pointer",
  },
};
