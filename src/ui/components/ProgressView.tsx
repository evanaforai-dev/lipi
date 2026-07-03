import type { Stage } from "../../shared/translate";
import { STAGE_LABEL, STAGE_ORDER } from "../../shared/translate";

type StageState = "done" | "active" | "pending";

// A staged generation view — calm and inevitable, not a spinner. Each step completes
// visibly so it reads like a production process the user can trust.
export function ProgressView({ status }: { status: Record<Stage, StageState> }) {
  return (
    <div style={styles.root}>
      <p style={styles.title}>Generating localized version…</p>
      <div style={styles.list}>
        {STAGE_ORDER.map((stage) => {
          const s = status[stage];
          return (
            <div key={stage} style={{ ...styles.row, opacity: s === "pending" ? 0.4 : 1 }}>
              <span
                className="lpt-mark"
                style={{ ...styles.mark, ...(s === "done" ? styles.markDone : null) }}
              >
                {s === "done" ? "✓" : s === "active" ? "•" : "○"}
              </span>
              <span style={{ fontWeight: s === "active" ? 600 : 400 }}>{STAGE_LABEL[stage]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", padding: "28px 20px", gap: 4 },
  title: { fontSize: 13, fontWeight: 600, margin: "0 0 18px" },
  list: { display: "flex", flexDirection: "column", gap: 14 },
  row: { display: "flex", alignItems: "center", gap: 12, fontSize: 13, transition: "opacity 0.3s ease" },
  mark: {
    width: 16,
    textAlign: "center",
    fontSize: 13,
    color: "var(--figma-color-text, #1e1e1e)",
  },
  markDone: { color: "#2f9e44" },
};
