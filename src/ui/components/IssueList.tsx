import type { CheckId, Issue } from "../../shared/types";
import { CHECK_COLOR, CHECK_LABEL } from "../../shared/constants";
import { IssueRow } from "./IssueRow";

const GROUP_ORDER: CheckId[] = ["overflow", "line-clip", "missing-font", "small-indic"];

export function IssueList({
  issues,
  activeCheckId,
  activeIssueId,
  onReveal,
  onSelect,
  onGoToComponent,
}: {
  issues: Issue[];
  activeCheckId: CheckId | null;
  activeIssueId: string | null;
  onReveal: (checkId: CheckId, nodeIds: string[]) => void;
  onSelect: (issue: Issue) => void;
  onGoToComponent: (componentId: string) => void;
}) {
  return (
    <div style={styles.list}>
      {GROUP_ORDER.map((checkId) => {
        const group = issues.filter((i) => i.checkId === checkId);
        if (group.length === 0) return null;
        const color = CHECK_COLOR[checkId];
        const active = activeCheckId === checkId;
        const nodeIds = [...new Set(group.map((i) => i.nodeId))];
        return (
          <section key={checkId} style={styles.group}>
            <button
              style={{
                ...styles.heading,
                borderLeft: `3px solid ${color}`,
                background: active ? `${color}22` : "transparent",
              }}
              onClick={() => onReveal(checkId, nodeIds)}
              title="Reveal affected layers on the canvas"
            >
              <span style={styles.headingLabel}>{CHECK_LABEL[checkId]}</span>
              <span style={styles.count}>{group.length}</span>
              {active && <span style={{ ...styles.activeTag, color }}>● revealing</span>}
            </button>
            {group.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                active={issue.id === activeIssueId}
                onSelect={onSelect}
                onGoToComponent={onGoToComponent}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: "flex", flexDirection: "column", gap: 14 },
  group: { display: "flex", flexDirection: "column", gap: 2 },
  heading: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: "5px 8px",
    margin: "0 0 4px",
    border: "none",
    borderRadius: 4,
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
  },
  headingLabel: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 },
  count: { fontSize: 11, opacity: 0.5 },
  activeTag: { fontSize: 10, fontWeight: 600, marginLeft: "auto" },
};
