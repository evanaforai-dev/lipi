import { useState } from "react";
import type { Language } from "../../shared/translate";
import { PROVIDERS, type ProviderId } from "../translate/provider";

// Entry experience: choose a language, then generate & test. No mention of pipelines,
// providers, or engines — the user just asks for a Hindi version and what to fix.
const LANGS: { id: Language | "ta" | "bn"; label: string; enabled: boolean }[] = [
  { id: "hi", label: "हिन्दी", enabled: true },
  { id: "ta", label: "தமிழ்", enabled: false },
  { id: "bn", label: "বাংলা", enabled: false },
];

export function GenerateView({
  language,
  providerId,
  keyRequired,
  hasKey,
  error,
  onSelectProvider,
  onSaveKey,
  onGenerate,
}: {
  language: Language;
  providerId: ProviderId;
  keyRequired: boolean;
  hasKey: boolean;
  error: string | null;
  onSelectProvider: (id: ProviderId) => void;
  onSaveKey: (key: string) => void;
  onGenerate: () => void;
}) {
  const [keyDraft, setKeyDraft] = useState("");
  const blocked = keyRequired && !hasKey;

  return (
    <div style={styles.root}>
      <h1 style={styles.title}>Localization Pressure Test</h1>
      <p style={styles.subtitle}>Generate a localized version of your screens and see what to fix.</p>

      <p style={styles.label}>Choose language</p>
      <div style={styles.langs}>
        {LANGS.map((l) => {
          const selected = l.id === language;
          return (
            <div
              key={l.id}
              style={{
                ...styles.lang,
                ...(selected ? styles.langOn : null),
                ...(l.enabled ? null : styles.langOff),
              }}
            >
              <span style={styles.radio}>{selected ? "●" : "○"}</span>
              {l.label}
              {!l.enabled && <span style={styles.soon}>soon</span>}
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
              <span style={styles.radio}>{selected ? "●" : "○"}</span>
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
            style={styles.secondary}
            onClick={() => keyDraft.trim() && onSaveKey(keyDraft.trim())}
          >
            Save key
          </button>
        </div>
      ) : null}

      {error && <p style={styles.error}>{error}</p>}

      <button style={styles.primary} onClick={onGenerate} disabled={blocked}>
        Generate &amp; Test
      </button>
      <p style={styles.foot}>Select your English frames on the canvas first.</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: "flex", flexDirection: "column", padding: "20px 16px", gap: 4 },
  title: { fontSize: 15, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 12, opacity: 0.7, margin: "2px 0 18px", lineHeight: 1.4 },
  label: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.6, margin: "0 0 8px" },
  langs: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 },
  lang: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid var(--figma-color-border, #e0e0e0)",
    fontSize: 14,
  },
  langOn: { borderColor: "var(--figma-color-border-brand, #0d99ff)" },
  langOff: { opacity: 0.4 },
  radio: { fontSize: 11 },
  soon: { marginLeft: "auto", fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.4 },
  keyBlock: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  hint: { fontSize: 11, opacity: 0.7, margin: 0 },
  input: {
    fontSize: 12,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid var(--figma-color-border, #ccc)",
    background: "var(--figma-color-bg, #fff)",
    color: "inherit",
  },
  secondary: {
    fontSize: 12,
    padding: "7px 12px",
    borderRadius: 6,
    border: "1px solid var(--figma-color-border, #ccc)",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  error: { fontSize: 12, color: "#e03e3e", margin: "0 0 10px" },
  primary: {
    fontSize: 13,
    fontWeight: 600,
    padding: "11px 12px",
    borderRadius: 8,
    border: "none",
    background: "var(--figma-color-bg-brand, #0d99ff)",
    color: "#fff",
    cursor: "pointer",
    marginTop: 4,
  },
  foot: { fontSize: 11, opacity: 0.55, margin: "10px 0 0", textAlign: "center" },
};
