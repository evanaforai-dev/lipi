// Shared, professional empty/status states: a centered StatusView for whole-content moments
// (no issues, errors) and an inline StatusBanner for transient confirmations (export, preview).
// Each carries an icon, a clear title, one supporting sentence, and an obvious next action.

export function StatusView({
  icon,
  tone = "neutral",
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon: string;
  tone?: "neutral" | "positive" | "warning";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.badge, ...TONE[tone] }}>{icon}</div>
      <h2 style={styles.title}>{title}</h2>
      <p style={styles.desc}>{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div style={styles.actions}>
          {actionLabel && (
            <button style={styles.primary} onClick={onAction}>
              {actionLabel}
            </button>
          )}
          {secondaryLabel && (
            <button style={styles.secondary} onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusBanner({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
}: {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div style={styles.banner}>
      <span style={styles.bannerIcon}>{icon}</span>
      <span style={styles.bannerText}>
        <span style={styles.bannerTitle}>{title}</span>
        <span style={styles.bannerMsg}>{message}</span>
      </span>
      {actionLabel && (
        <button style={styles.bannerAction} onClick={onAction}>
          {actionLabel}
        </button>
      )}
      <button style={styles.bannerClose} onClick={onDismiss} title="Dismiss">
        ✕
      </button>
    </div>
  );
}

const TONE: Record<string, React.CSSProperties> = {
  neutral: {
    background: "var(--figma-color-bg-secondary, #f0f0f0)",
    color: "var(--figma-color-text, #333)",
  },
  positive: {
    background: "var(--figma-color-bg-success-tertiary, #e7f5ec)",
    color: "var(--figma-color-text-success, #338a4d)",
  },
  warning: {
    background: "var(--figma-color-bg-warning-tertiary, #fff4e5)",
    color: "var(--figma-color-text-warning, #b76e00)",
  },
};

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 8,
    padding: "40px 24px",
  },
  badge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    fontSize: 22,
    marginBottom: 4,
  },
  title: { fontSize: 15, fontWeight: 600, margin: 0 },
  desc: { fontSize: 12.5, opacity: 0.65, lineHeight: 1.5, margin: 0, maxWidth: 280 },
  actions: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  primary: {
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "var(--figma-color-bg-brand, #0d99ff)",
    color: "var(--figma-color-text-onbrand, #fff)",
    cursor: "pointer",
  },
  secondary: {
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid var(--figma-color-border, #d5d5d5)",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
  },
  banner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: "var(--figma-color-bg-secondary, #f4f4f4)",
    marginBottom: 12,
  },
  bannerIcon: { fontSize: 16, flex: "0 0 auto" },
  bannerText: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 },
  bannerTitle: { fontSize: 12, fontWeight: 600 },
  bannerMsg: { fontSize: 11, opacity: 0.65, lineHeight: 1.4 },
  bannerAction: {
    flex: "0 0 auto",
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 10px",
    borderRadius: 6,
    border: "none",
    background: "var(--figma-color-bg, #fff)",
    color: "var(--figma-color-text-brand, #0d99ff)",
    cursor: "pointer",
  },
  bannerClose: {
    flex: "0 0 auto",
    fontSize: 11,
    padding: "4px 6px",
    border: "none",
    background: "transparent",
    color: "inherit",
    opacity: 0.5,
    cursor: "pointer",
  },
};
