import type { ScreenSummary } from "../../shared/types";
import { impactBand, type ImpactBand } from "../../shared/impact";

const BAND_LABEL: Record<ImpactBand, string> = {
  high: "High Impact",
  medium: "Medium Impact",
  low: "Low Impact",
};
const BAND_COLOR: Record<ImpactBand, string> = {
  high: "#e03e3e",
  medium: "#d9822b",
  low: "#8a8a8a",
};

// Screen Intelligence: which screens are worst, which are clean, and per-screen progress.
export function ScreensPanel({
  screens,
  onSelectScreen,
}: {
  screens: ScreenSummary[];
  onSelectScreen: (frameId: string) => void;
}) {
  if (screens.length === 0) return null;
  const top = screens.slice(0, 10);

  return (
    <section style={styles.panel}>
      <h2 style={styles.heading}>Screens</h2>
      {top.map((s) => {
        const clean = s.issueCount === 0;
        const band = impactBand(s.impactScore);
        const showResolved = s.resolvedCount !== undefined && s.resolvedCount > 0;
        return (
          <button
            key={s.id}
            style={styles.row}
            onClick={() => onSelectScreen(s.id)}
            title="Select & zoom to screen"
          >
            <span style={styles.left}>
              <span style={styles.name} title={s.name}>
                {s.name}
              </span>
              <span style={styles.meta}>
                {clean ? "clear" : `${s.issueCount} place${s.issueCount === 1 ? "" : "s"}`}
                {showResolved && (
                  <span style={styles.resolved}>
                    {" · ✓ "}
                    {s.resolvedCount} fixed
                    {s.previousIssueCount !== undefined ? ` (was ${s.previousIssueCount})` : ""}
                  </span>
                )}
              </span>
            </span>
            {clean ? (
              <span style={styles.clean}>✓</span>
            ) : (
              <span style={{ ...styles.band, color: BAND_COLOR[band] }}>{BAND_LABEL[band]}</span>
            )}
          </button>
        );
      })}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "10px 8px 12px",
    margin: "0 0 12px",
    borderRadius: 8,
    background: "var(--figma-color-bg-secondary, #f5f5f5)",
  },
  heading: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    opacity: 0.7,
    margin: "0 0 6px",
    padding: "0 4px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    textAlign: "left",
    padding: "6px 6px",
    border: "none",
    borderRadius: 6,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
  },
  left: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0 },
  name: {
    fontSize: 12,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  meta: { fontSize: 10, opacity: 0.7 },
  resolved: { color: "#2f9e44", fontWeight: 600 },
  band: { fontSize: 10, fontWeight: 700, flex: "0 0 auto" },
  clean: { fontSize: 12, fontWeight: 700, color: "#2f9e44", flex: "0 0 auto" },
};
