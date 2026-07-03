import type { Issue, IssueStatus, Severity } from "../../shared/types";

const SEVERITY_COLOR: Record<Severity, string> = {
  error: "#e03e3e",
  warning: "#d9822b",
  info: "#0d99ff",
};

// Verify Mode stripe: green resolved · red new · gray unchanged.
const STATUS_COLOR: Record<IssueStatus, string> = {
  resolved: "#2f9e44",
  new: "#e03e3e",
  unchanged: "#b3b3b3",
};

export function IssueRow({
  issue,
  active,
  onSelect,
  onGoToComponent,
}: {
  issue: Issue;
  active: boolean;
  onSelect: (issue: Issue) => void;
  onGoToComponent: (componentId: string) => void;
}) {
  const inComponent = issue.componentId && issue.componentName;
  const statusStripe = issue.status
    ? { borderLeft: `2px solid ${STATUS_COLOR[issue.status]}` }
    : null;

  return (
    <div style={{ ...styles.row, ...statusStripe, ...(active ? styles.rowActive : null) }}>
      <button style={styles.main} onClick={() => onSelect(issue)} title="Go to layer">
        <span style={{ ...styles.dot, background: SEVERITY_COLOR[issue.severity] }} />
        <span style={styles.body}>
          <span style={styles.name}>{issue.nodeName}</span>
          <span style={styles.message}>{issue.message}</span>
          {issue.detail && <span style={styles.detail}>{issue.detail}</span>}
        </span>
      </button>

      {inComponent && (
        <div style={styles.componentBar}>
          <span style={styles.componentName} title={issue.componentName}>
            ⬩ {issue.componentName}
          </span>
          <button
            style={styles.componentButton}
            onClick={() => onGoToComponent(issue.componentId!)}
          >
            Go To Component
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    flexDirection: "column",
    borderLeft: "2px solid transparent",
    borderRadius: 6,
  },
  rowActive: {
    background: "var(--figma-color-bg-selected, #e5f0ff)",
    borderLeft: "2px solid var(--figma-color-border-selected, #0d99ff)",
  },
  main: {
    display: "flex",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: "8px 8px 4px",
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
  },
  dot: { flex: "0 0 auto", width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  body: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  name: { fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" },
  message: { fontSize: 11, lineHeight: 1.4, opacity: 0.9 },
  detail: { fontSize: 10, opacity: 0.6, fontVariantNumeric: "tabular-nums" },
  componentBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    padding: "0 8px 8px 24px",
  },
  componentName: {
    fontSize: 10,
    opacity: 0.7,
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  componentButton: {
    fontSize: 10,
    padding: "2px 8px",
    borderRadius: 6,
    border: "1px solid var(--figma-color-border, #ccc)",
    background: "var(--figma-color-bg, #fff)",
    color: "inherit",
    cursor: "pointer",
  },
  occurrences: {
    fontSize: 10,
    width: "100%",
    color: "var(--figma-color-text-brand, #0d6efd)",
  },
};
