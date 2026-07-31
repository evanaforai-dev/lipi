// Lightweight, one-time onboarding shown before the first analysis. Explains the four-step
// workflow with a single illustration, then hands off to the generate screen. Presentation only.

const STEPS: string[] = [
  "Select screens",
  "Choose language",
  "Generate & Analyze",
  "Preview & Export",
];

export function OnboardingView({ onStart }: { onStart: () => void }) {
  return (
    <div className="lpt-page" style={styles.root}>
      <Illustration />
      <h1 style={styles.title}>Test your UI in another language</h1>
      <p style={styles.subtitle}>Catch layout breaks from localized text before handoff.</p>

      <ol style={styles.steps}>
        {STEPS.map((s, i) => (
          <li key={s} style={styles.step}>
            <span style={styles.num}>{i + 1}</span>
            <span style={styles.stepTitle}>{s}</span>
          </li>
        ))}
      </ol>

      <button className="lpt-btn lpt-btn-primary lpt-btn-lg lpt-btn-block" onClick={onStart}>
        Get Started
      </button>
    </div>
  );
}

// One minimal illustration: an English screen becoming a localized one. Frames use currentColor
// (adapts to the theme); the localized screen uses the Figma brand accent.
function Illustration() {
  return (
    <svg
      style={styles.art}
      width="140"
      height="96"
      viewBox="0 0 140 96"
      fill="none"
      aria-hidden="true"
    >
      <rect x="10" y="14" width="52" height="68" rx="8" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2" />
      <rect x="20" y="27" width="32" height="4" rx="2" fill="currentColor" fillOpacity="0.18" />
      <rect x="20" y="37" width="24" height="4" rx="2" fill="currentColor" fillOpacity="0.18" />
      <rect x="20" y="60" width="20" height="8" rx="4" fill="currentColor" fillOpacity="0.14" />

      <path
        d="M66 48h8m0 0-3-3m3 3-3 3"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <rect x="78" y="14" width="52" height="68" rx="8" fill="#0d99ff" fillOpacity="0.08" stroke="#0d99ff" strokeWidth="2" />
      <rect x="88" y="27" width="38" height="4" rx="2" fill="#0d99ff" fillOpacity="0.55" />
      <rect x="88" y="37" width="32" height="4" rx="2" fill="#0d99ff" fillOpacity="0.55" />
      <rect x="88" y="60" width="26" height="8" rx="4" fill="#0d99ff" fillOpacity="0.4" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "28px 24px",
    gap: 8,
    color: "var(--figma-color-text, #1e1e1e)",
  },
  art: { color: "var(--figma-color-text, #1e1e1e)", marginBottom: 8 },
  title: { fontSize: 15, fontWeight: 600, margin: 0 },
  subtitle: { fontSize: 12, opacity: 0.65, lineHeight: 1.45, margin: "2px 0 20px", maxWidth: 260 },
  steps: {
    listStyle: "none",
    margin: "0 0 24px",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    width: "100%",
    textAlign: "left",
  },
  step: { display: "flex", alignItems: "center", gap: 12 },
  num: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    borderRadius: 11,
    fontSize: 11,
    fontWeight: 600,
    background: "var(--figma-color-bg-secondary, #f0f0f0)",
    color: "var(--figma-color-text, #333)",
  },
  stepTitle: { fontSize: 13, fontWeight: 600 },
};
