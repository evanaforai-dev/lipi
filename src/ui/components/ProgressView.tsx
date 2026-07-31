import type { Stage } from "../../shared/translate";
import { STAGE_ORDER } from "../../shared/translate";

type StageState = "done" | "active" | "pending";

// Calm, single-line progress — one headline plus a determinate bar that advances as the
// pipeline completes. The per-stage engine steps are intentionally not surfaced: during a
// short wait, users want "how far along", not a reading task in engine vocabulary.
export function ProgressView({ status }: { status: Record<Stage, StageState> }) {
  const done = STAGE_ORDER.filter((s) => status[s] === "done").length;
  const pct = Math.round((done / STAGE_ORDER.length) * 100);

  return (
    <div style={styles.root}>
      <p style={styles.title}>Analyzing localization…</p>
      <p style={styles.sub}>Translating and measuring your screens.</p>
      <div style={styles.track}>
        <div style={{ ...styles.bar, width: `${Math.max(pct, 6)}%` }} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", padding: "40px 20px", gap: 8 },
  title: { fontSize: 14, fontWeight: 600, margin: 0 },
  sub: { fontSize: 12, opacity: 0.6, margin: "0 0 16px", lineHeight: 1.4 },
  track: {
    width: "100%",
    height: 4,
    borderRadius: 4,
    background: "var(--figma-color-bg-secondary, #ececec)",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
    background: "var(--figma-color-bg-brand, #0d99ff)",
    transition: "width 320ms ease",
  },
};
