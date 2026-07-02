import { useEffect, useState } from "react";
import type { Issue, Severity } from "../../shared/types";
import type { ScreenView } from "../screenViewModel";

const SEVERITY_COLOR: Record<Severity, string> = {
  error: "#e03e3e",
  warning: "#d9822b",
  info: "#0d99ff",
};

// Screen-first presentation: each screen is a collapsible section (worst first, only the top
// one open by default). Designers fix one screen fully, then move to the next.
// Pure view over the frozen Report — see screenViewModel.ts.
export function ScreensView({
  views,
  onShow,
}: {
  views: ScreenView[];
  onShow: (issue: Issue) => void;
}) {
  // Only the worst screen (views are impact-sorted) is expanded by default. Reset when a new
  // report arrives (views identity changes only when the report does — App memoizes it).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    setExpanded(new Set(views[0] ? [views[0].screenId] : []));
  }, [views]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div style={styles.wrap}>
      <div style={styles.sectionHeading}>Screens</div>
      {views.map((screen) => {
        const isOpen = expanded.has(screen.screenId);
        return (
          <section key={screen.screenId} style={styles.screen}>
            <button
              style={styles.screenHead}
              onClick={() => toggle(screen.screenId)}
              title={isOpen ? "Collapse screen" : "Expand screen"}
            >
              <span style={{ ...styles.sev, background: SEVERITY_COLOR[screen.severity] }} />
              <span style={styles.screenName} title={screen.screenName}>
                {screen.screenName}
              </span>
              <span style={styles.screenCount}>
                {screen.issueCount} issue{screen.issueCount === 1 ? "" : "s"}
              </span>
              <span style={styles.chevron}>{isOpen ? "▼" : "▶"}</span>
            </button>

            {isOpen &&
              screen.groups.map((group) => (
                <div key={group.title} style={styles.group}>
                  <div style={styles.groupTitle}>
                    {group.title} ({group.items.length})
                  </div>
                  {group.items.map(({ issue, description }) => (
                    <div key={issue.id} style={styles.item}>
                      <span style={{ ...styles.dot, background: SEVERITY_COLOR[issue.severity] }} />
                      <span style={styles.body}>
                        <span style={styles.name} title={issue.nodeName}>
                          {issue.nodeName}
                        </span>
                        <span style={styles.desc}>{description}</span>
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
              ))}
          </section>
        );
      })}
    </div>
  );
}

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
  screenHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 0,
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    textAlign: "left",
  },
  sev: { flex: "0 0 auto", width: 8, height: 8, borderRadius: 4 },
  screenName: {
    fontSize: 12,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  screenCount: { fontSize: 11, opacity: 0.5, marginLeft: "auto", flex: "0 0 auto" },
  chevron: { fontSize: 9, opacity: 0.5, flex: "0 0 auto" },
  group: { display: "flex", flexDirection: "column", gap: 2 },
  groupTitle: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.55,
    margin: "4px 0 2px",
  },
  item: { display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 2px" },
  dot: { flex: "0 0 auto", width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  body: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 },
  name: { fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" },
  desc: { fontSize: 11, lineHeight: 1.4, opacity: 0.8 },
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
