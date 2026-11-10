import type { Language } from "../../shared/translate";
import { PROVIDERS, type ProviderId } from "../translate/provider";
import { CheckboxIcon, RadioIcon } from "./icons";

// Entry experience: choose one or more languages, then generate & test. No mention of
// pipelines, providers, or engines — the user just asks for localized versions and what to fix.
const LANGS: { id: Language; label: string }[] = [
  { id: "hi", label: "हिन्दी" },
  { id: "ta", label: "தமிழ்" },
];

export function GenerateView({
  selectedLangs,
  providerId,
  error,
  onToggleLang,
  onSelectProvider,
  onGenerate,
}: {
  selectedLangs: Language[];
  providerId: ProviderId;
  error: { title: string; message: string } | null;
  onToggleLang: (id: Language) => void;
  onSelectProvider: (id: ProviderId) => void;
  onGenerate: () => void;
}) {
  const blocked = selectedLangs.length === 0;

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>Lipi</h1>
      <p style={styles.subtitle}>Generate localized versions of your screens and see what to fix.</p>

      <p style={styles.label}>Choose languages</p>
      <div style={styles.langs}>
        {LANGS.map((l) => {
          const selected = selectedLangs.includes(l.id);
          return (
            <div
              key={l.id}
              style={{ ...styles.lang, ...(selected ? styles.langOn : null) }}
              onClick={() => onToggleLang(l.id)}
            >
              <CheckboxIcon checked={selected} size={16} />
              {l.label}
            </div>
          );
        })}
      </div>

      <p style={styles.label}>Translation</p>
      <div style={styles.langs}>
        {PROVIDERS.map((p) => {
          const selected = p.id === providerId;
          return (
            <div
              key={p.id}
              style={{ ...styles.lang, ...(selected ? styles.langOn : null) }}
              onClick={() => onSelectProvider(p.id)}
            >
              <RadioIcon selected={selected} size={16} />
              {p.label}
              <span style={styles.soon}>{PROVIDER_NOTE[p.id]}</span>
            </div>
          );
        })}
      </div>

      {providerId === "free" && (
        <p style={{ ...styles.hint, margin: "-12px 0 16px" }}>
          Real machine translation, about 5,000 characters a day. Past that, Lipi uses placeholder
          text in the right script so the test still runs.
        </p>
      )}

      {error && (
        <div style={styles.errorCard}>
          <span style={styles.errorIcon}>!</span>
          <span style={styles.errorBody}>
            <span style={styles.errorTitle}>{error.title}</span>
            <span style={styles.errorMsg}>{error.message}</span>
          </span>
        </div>
      )}

      <button
        className="lpt-btn lpt-btn-primary lpt-btn-lg lpt-btn-block"
        style={{ marginTop: 4 }}
        onClick={onGenerate}
        disabled={blocked}
      >
        Generate &amp; Test
      </button>
      <p style={styles.foot}>Select your English frames on the canvas first.</p>
      <p style={styles.foot}>
        <a style={styles.link} href={FEEDBACK_URL} target="_blank" rel="noreferrer">
          Send feedback
        </a>
      </p>
    </div>
  );
}

const PROVIDER_NOTE: Record<ProviderId, string> = {
  free: "no key",
  demo: "offline",
};

const FEEDBACK_URL =
  "mailto:evana.s.pallivathukkal@gmail.com?subject=Lipi%20feedback";

const styles: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", padding: "20px 16px", gap: 4 },
  title: { fontSize: 15, fontWeight: 600, margin: 0 },
  subtitle: { fontSize: 12, opacity: 0.7, margin: "2px 0 20px", lineHeight: 1.4 },
  label: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.6, margin: "0 0 8px" },
  langs: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  lang: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--figma-color-border, #e0e0e0)",
    fontSize: 14,
  },
  langOn: { borderColor: "var(--figma-color-border-brand, #0d99ff)" },
  langOff: { opacity: 0.4 },
  radio: { fontSize: 11 },
  soon: { marginLeft: "auto", fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.4 },
  hint: { fontSize: 11, opacity: 0.7, margin: 0 },
  errorCard: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    padding: "8px 12px",
    borderRadius: 8,
    background: "var(--figma-color-bg-warning-tertiary, #fff4e5)",
    margin: "0 0 12px",
  },
  errorIcon: {
    flex: "0 0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    background: "var(--figma-color-bg-warning, #d9822b)",
    color: "#fff",
  },
  errorBody: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  errorTitle: { fontSize: 12, fontWeight: 600 },
  errorMsg: { fontSize: 11, opacity: 0.75, lineHeight: 1.4 },
  link: { color: "var(--figma-color-text-brand, #0d99ff)", textDecoration: "none" },
  foot: { fontSize: 11, opacity: 0.55, margin: "8px 0 0", textAlign: "center" },
};
