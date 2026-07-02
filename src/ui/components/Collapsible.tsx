import { type ReactNode, useState } from "react";

// Collapsed-by-default disclosure for demoted, fallback surfaces (All Issues, By Screen).
export function Collapsible({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section style={styles.section}>
      <button style={styles.header} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span style={styles.caret}>{open ? "▾" : "▸"}</span>
        {label}
      </button>
      {open && <div style={styles.body}>{children}</div>}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { borderTop: "1px solid var(--figma-color-border, #ececec)", paddingTop: 8 },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    textAlign: "left",
    padding: "6px 8px",
    border: "none",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    font: "inherit",
    fontSize: 12,
    fontWeight: 600,
    opacity: 0.75,
  },
  caret: { fontSize: 10, opacity: 0.7, width: 10 },
  body: { paddingTop: 6 },
};
