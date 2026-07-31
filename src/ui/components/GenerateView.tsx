import { useState } from "react";
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
  keyRequired,
  hasKey,
  error,
  onToggleLang,
  onSelectProvider,
  onSaveKey,
  onGenerate,
}: {
  selectedLangs: Language[];
  providerId: ProviderId;
  keyRequired: boolean;
  hasKey: boolean;
  error: { title: string; message: string } | null;
  onToggleLang: (id: Language) => void;
  onSelectProvider: (id: ProviderId) => void;
  onSaveKey: (key: string) => void;
  onGenerate: () => void;
}) {
  const [keyDraft, setKeyDraft] = useState("");
  const blocked = (keyRequired && !hasKey) || selectedLangs.length === 0;

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>Localization Pressure Test</h1>
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
              <span style={styles.soon}>{p.requiresKey ? "API key" : "no key"}</span>
            </div>
          );
        })}
      </div>

      {blocked ? (
        <div style={styles.keyBlock}>
          <p style={styles.hint}>Add a Google Translation key to enable generation.</p>
          <input
            style={styles.input}
            type="password"
            placeholder="Paste key"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <button
            className="lpt-btn lpt-btn-secondary lpt-btn-sm"
            style={{ alignSelf: "flex-start" }}
            onClick={() => keyDraft.trim() && onSaveKey(keyDraft.trim())}
          >
            Save key
          </button>
        </div>
      ) : null}

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
    </div>
  );
}

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
  keyBlock: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  hint: { fontSize: 11, opacity: 0.7, margin: 0 },
  input: {
    fontSize: 12,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--figma-color-border, #ccc)",
    background: "var(--figma-color-bg, #fff)",
    color: "inherit",
  },
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
  foot: { fontSize: 11, opacity: 0.55, margin: "8px 0 0", textAlign: "center" },
};
