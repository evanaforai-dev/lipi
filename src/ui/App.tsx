import { useMemo, useRef, useState } from "react";
import type { MainToUi } from "../shared/messages";
import type { CheckId, Issue, Report } from "../shared/types";
import type { GenMeta, Language, Stage } from "../shared/translate";
import { LANGUAGE_LABEL, STAGE_ORDER } from "../shared/translate";
import { usePluginBridge } from "./hooks/usePluginBridge";
import { getProvider, type ProviderId } from "./translate/provider";
import { OnboardingView } from "./components/OnboardingView";
import { GenerateView } from "./components/GenerateView";
import { ProgressView } from "./components/ProgressView";
import { RootCausePanel } from "./components/RootCausePanel";
import { ScreensView } from "./components/ScreensView";
import { StatusView, StatusBanner } from "./components/StatusView";
import { CheckIcon, EyeIcon } from "./components/icons";
import type { ReactNode } from "react";
import { buildScreenViews } from "./screenViewModel";

type Phase = "boot" | "onboarding" | "generate" | "generating" | "advisor";
type StageState = "done" | "active" | "pending";

interface RevealState {
  active: boolean;
  count: number;
  checkId: CheckId | null;
}
const NO_REVEAL: RevealState = { active: false, count: 0, checkId: null };

// Plain-language name for each pressure type, used mid-sentence in the results headline.
const DOMINANT_LABEL: Record<string, string> = {
  overflow: "text overflow",
  "small-indic": "text too small",
  "line-clip": "clipped lines",
  "missing-font": "unsupported fonts",
};

const emptyStages = (): Record<Stage, StageState> => {
  const s = {} as Record<Stage, StageState>;
  for (const stage of STAGE_ORDER) s[stage] = "pending";
  return s;
};
const stagesUpTo = (stage: Stage): Record<Stage, StageState> => {
  const idx = STAGE_ORDER.indexOf(stage);
  const s = {} as Record<Stage, StageState>;
  STAGE_ORDER.forEach((st, i) => (s[st] = i < idx ? "done" : i === idx ? "active" : "pending"));
  return s;
};
const allDone = (): Record<Stage, StageState> => {
  const s = {} as Record<Stage, StageState>;
  for (const stage of STAGE_ORDER) s[stage] = "done";
  return s;
};

export function App() {
  // Start on "boot" until clientStorage tells us whether onboarding has been seen.
  const [phase, setPhase] = useState<Phase>("boot");
  const [onboarded, setOnboarded] = useState(false);
  // Demo is the default so the plugin runs immediately after cloning — no API key needed.
  const [providerId, setProviderId] = useState<ProviderId>("demo");
  const [key, setKey] = useState<string | null>(null);
  const [genError, setGenError] = useState<{ title: string; message: string } | null>(null);
  const [stageStatus, setStageStatus] = useState<Record<Stage, StageState>>(emptyStages());
  // Multi-language: each selected language keeps its own report; activeLang is the one on view.
  const [selectedLangs, setSelectedLangs] = useState<Language[]>(["hi"]);
  const [reports, setReports] = useState<Partial<Record<Language, { report: Report; meta: GenMeta }>>>(
    {},
  );
  const [activeLang, setActiveLang] = useState<Language | null>(null);
  const [previewLang, setPreviewLang] = useState<Language | null>(null); // which language is previewed
  // Transient confirmation (export complete / preview closed), shown as a dismissible banner.
  const [banner, setBanner] = useState<
    { icon: ReactNode; title: string; message: string; actionLabel?: string; onAction?: () => void } | null
  >(null);
  // Review lens: screen-first (per-screen findings) vs system-level (root-cause / component fixes).
  const [reviewMode, setReviewMode] = useState<"screens" | "system">("screens");
  // Which screen card is open — lifted so the Design System view can open a screen (two-way link).
  const [openScreenId, setOpenScreenId] = useState<string | null>(null);
  // Languages still to run through the pipeline this analysis (order = selection order).
  const genQueue = useRef<Language[]>([]);
  const genStrings = useRef<string[]>([]);

  // Derived from the active language — the rest of the UI reads these as before.
  const active = activeLang ? reports[activeLang] : undefined;
  const report = active?.report ?? null;
  const meta = active?.meta ?? null;
  const previewActive = previewLang !== null;
  const doneLangs = selectedLangs.filter((l) => reports[l]);

  // Advisor state (unchanged behavior).
  const [, setRevealState] = useState<RevealState>(NO_REVEAL);
  const [navError, setNavError] = useState<string | null>(null);
  const [revealingCauseId, setRevealingCauseId] = useState<string | null>(null);

  const { send } = usePluginBridge((msg: MainToUi) => {
    switch (msg.type) {
      case "KEY_STATE":
        setKey(msg.key);
        break;
      case "ONBOARD_STATE":
        // Route out of the boot splash: first-time users see onboarding, returning users don't.
        setOnboarded(msg.onboarded);
        setPhase((p) => (p === "boot" ? (msg.onboarded ? "generate" : "onboarding") : p));
        break;
      case "PREPARE_ERROR":
        setGenError({ title: "No screens selected", message: msg.message });
        setPhase("generate");
        break;
      case "PREPARE_RESULT":
        // Strings are language-agnostic (source English) — translate them per language below.
        genStrings.current = msg.strings;
        void runNextLanguage();
        break;
      case "STAGE":
        setStageStatus(stagesUpTo(msg.stage));
        break;
      case "GENERATE_RESULT": {
        const lang = msg.meta.language;
        setReports((prev) => ({ ...prev, [lang]: { report: msg.report, meta: msg.meta } }));
        genQueue.current = genQueue.current.filter((l) => l !== lang);
        if (genQueue.current.length > 0) {
          // More languages to analyze — run the same pipeline again for the next one.
          void runNextLanguage();
        } else {
          setStageStatus(allDone());
          setPhase("advisor");
          const first = selectedLangs[0];
          setActiveLang(first);
          setPreviewLang(first); // preview-as-default; PREVIEW_STATE confirms
          send({ type: "PREVIEW_ENTER", language: first });
        }
        break;
      }
      case "GENERATE_ERROR":
        setGenError({ title: "Analysis couldn't complete", message: msg.message });
        setPhase("generate");
        break;
      case "RECHECK_RESULT": {
        // Re-run of the same screens after fixes: update the report in place, show progress.
        const lang = msg.language;
        setReports((prev) => ({
          ...prev,
          [lang]: {
            report: msg.report,
            meta:
              prev[lang]?.meta ?? {
                language: lang,
                pageName: "",
                screens: msg.report.screens.length,
                strings: 0,
                recommendations: msg.report.rootCauses.length,
              },
          },
        }));
        setPreviewLang(null);
        setOpenScreenId(null);
        const fixed = msg.report.resolvedIssues?.length ?? 0;
        const remaining = msg.report.summary.totalIssues;
        setBanner({
          icon: <CheckIcon size={16} />,
          title: fixed > 0 ? `${fixed} fixed` : "Re-checked",
          message:
            remaining === 0
              ? "No issues left — you're clear."
              : `${remaining} issue${remaining === 1 ? "" : "s"} remaining.`,
        });
        break;
      }
      case "REVEAL_STATE":
        setRevealState({ active: msg.active, count: msg.count, checkId: msg.checkId });
        if (!msg.active) setRevealingCauseId(null);
        break;
      case "SELECT_RESULT":
        if (!msg.found) setNavError("That layer no longer exists. Generate again to refresh.");
        break;
      case "GO_TO_COMPONENT_RESULT":
        if (!msg.found) {
          setNavError("Main component not found. It may live in an external library.");
        }
        break;
      case "PREVIEW_STATE":
        setPreviewLang(msg.active ? msg.language : null);
        break;
      case "EXPORT_DONE":
        setBanner({
          icon: <CheckIcon size={16} />,
          title: "Export complete",
          message: `${msg.count} localized screen${msg.count === 1 ? "" : "s"} (${LANGUAGE_LABEL[msg.language]}) added to this page as a section.`,
          actionLabel: "New Analysis",
          onAction: newAnalysis,
        });
        break;
    }
  });

  // ── Generation flow ────────────────────────────────────────────────────────
  const saveKey = (k: string) => send({ type: "SAVE_KEY", key: k });

  const toggleLang = (l: Language) =>
    setSelectedLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const getStarted = () => setPhase("generate");

  const startGenerate = () => {
    if (selectedLangs.length === 0) return;
    // Running the first analysis retires onboarding for good.
    if (!onboarded) {
      send({ type: "MARK_ONBOARDED" });
      setOnboarded(true);
    }
    setGenError(null);
    setNavError(null);
    setBanner(null);
    setReports({});
    setActiveLang(null);
    setPreviewLang(null);
    genQueue.current = [...selectedLangs];
    setStageStatus(stagesUpTo("prepare"));
    setPhase("generating");
    send({ type: "PREPARE", language: selectedLangs[0] });
  };

  // Run the EXISTING pipeline once for the next queued language: translate, then GENERATE.
  const runNextLanguage = async () => {
    const lang = genQueue.current[0];
    if (!lang) return;
    const provider = getProvider(providerId);
    if (provider.requiresKey && !key) {
      setGenError({ title: "Translation key needed", message: "Add a translation key to run analysis." });
      setPhase("generate");
      return;
    }
    setStageStatus(stagesUpTo("translating"));
    const { map } = await provider.translate(genStrings.current, lang, key ?? "");
    send({ type: "GENERATE", language: lang, translations: map });
  };

  const enterPreview = () => {
    if (!activeLang) return;
    setBanner(null);
    send({ type: "PREVIEW_ENTER", language: activeLang });
  };
  const exitPreview = () => {
    send({ type: "PREVIEW_EXIT" });
    setBanner({
      icon: <EyeIcon size={16} />,
      title: "Preview closed",
      message: "Your original screens are back on the canvas.",
      actionLabel: "Preview again",
      onAction: enterPreview,
    });
  };
  const exportLocalized = () => {
    if (activeLang) send({ type: "EXPORT", language: activeLang });
  };
  // Re-check the same screens after fixing — the count drops as issues resolve.
  const recheck = () => {
    if (activeLang) send({ type: "RECHECK", language: activeLang });
  };

  // Switch the viewed language (its own report), and move the on-canvas preview with it.
  const switchLanguage = (lang: Language) => {
    if (lang === activeLang) return;
    setActiveLang(lang);
    setNavError(null);
    setRevealingCauseId(null);
    setBanner(null);
    setOpenScreenId(null);
    if (previewActive) send({ type: "PREVIEW_ENTER", language: lang });
  };

  // ── Two-way link between the views ──────────────────────────────────────────
  const toggleScreen = (id: string) => setOpenScreenId((cur) => (cur === id ? null : id));
  const openSystemView = () => setReviewMode("system"); // a screen problem → its systemic fix
  const openScreenFromSystem = (frameId: string) => {
    // a system fix → where it appears
    setReviewMode("screens");
    setOpenScreenId(frameId);
  };

  // In-app reset: return to the initial language screen without reopening the plugin. Restores
  // the canvas (exit preview / clear reveal) and clears all analysis + status UI state.
  const newAnalysis = () => {
    if (previewActive) send({ type: "PREVIEW_EXIT" });
    send({ type: "EXIT_REVEAL" });
    setReports({});
    setActiveLang(null);
    setPreviewLang(null);
    setSelectedLangs(["hi"]); // clear language selection back to the fresh-open default
    genQueue.current = [];
    setOpenScreenId(null);
    setBanner(null);
    setNavError(null);
    setGenError(null);
    setRevealingCauseId(null);
    setRevealState(NO_REVEAL);
    // reviewMode intentionally preserved — the toggle remembers the user's last-chosen lens.
    setStageStatus(emptyStages());
    setPhase("generate");
  };

  // ── Advisor handlers ────────────────────────────────────────────────────────
  const revealGroup = (checkId: CheckId, nodeIds: string[]) =>
    send({ type: "REVEAL", checkId, nodeIds });
  // Reveal a single finding on the canvas — the frozen reveal mechanism.
  const revealScreen = (checkId: CheckId, nodeIds: string[]) => {
    setNavError(null);
    revealGroup(checkId, nodeIds);
  };
  // "Preview Screen" — jump to the screen on the canvas (preview-aware SELECT_NODE, unchanged).
  const previewScreen = (screenId: string) => {
    setNavError(null);
    send({ type: "SELECT_NODE", nodeId: screenId });
  };
  const revealCause = (causeId: string, checkId: CheckId, nodeIds: string[]) => {
    setRevealingCauseId(causeId);
    send({ type: "REVEAL", checkId, nodeIds });
  };
  const exitReveal = () => {
    setRevealingCauseId(null);
    send({ type: "EXIT_REVEAL" });
  };
  const goToComponent = (componentId: string) => {
    setNavError(null);
    send({ type: "GO_TO_COMPONENT", componentId });
  };

  const issueById = useMemo(() => {
    const map = new Map<string, Issue>();
    if (report) for (const i of report.issues) map.set(i.id, i);
    return map;
  }, [report]);

  // Presentation layer: the Report reshaped into a screen-first view (no analysis changes).
  const screenViews = useMemo(
    () => (report ? buildScreenViews(report, issueById) : []),
    [report, issueById],
  );

  // One restrained headline for the results: the total finding count and its dominant cause.
  const headline = useMemo(() => {
    if (!report || report.summary.totalIssues === 0) return null;
    const counts = new Map<string, number>();
    for (const i of report.issues) counts.set(i.checkId, (counts.get(i.checkId) ?? 0) + 1);
    let topId = "";
    let topN = 0;
    for (const [k, v] of counts) if (v > topN) ((topN = v), (topId = k));
    const total = report.summary.totalIssues;
    return { total, lead: topN === total ? "All" : "Mostly", label: DOMINANT_LABEL[topId] ?? "layout pressure" };
  }, [report]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (phase === "boot") {
    // Brief splash while clientStorage resolves the onboarding flag — avoids a wrong-screen flash.
    return <main style={styles.root} />;
  }

  if (phase === "onboarding") {
    return (
      <main key={phase} className="lpt-page" style={styles.root}>
        <OnboardingView onStart={getStarted} />
      </main>
    );
  }

  if (phase === "generate") {
    return (
      <main key={phase} className="lpt-page" style={styles.root}>
        <GenerateView
          selectedLangs={selectedLangs}
          providerId={providerId}
          keyRequired={getProvider(providerId).requiresKey}
          hasKey={!!key}
          error={genError}
          onToggleLang={toggleLang}
          onSelectProvider={setProviderId}
          onSaveKey={saveKey}
          onGenerate={startGenerate}
        />
      </main>
    );
  }

  if (phase === "generating") {
    return (
      <main key={phase} className="lpt-page" style={styles.root}>
        <ProgressView status={stageStatus} />
      </main>
    );
  }

  // phase === "advisor"
  return (
    <main key={phase} className="lpt-page" style={styles.root}>
      {meta && (
        <header className="lpt-header" style={styles.complete}>
          {previewActive ? (
            <div>
              <p style={styles.previewTitle}>Previewing {LANGUAGE_LABEL[meta.language]}</p>
              <p style={styles.completeMeta}>
                {meta.screens} screen{meta.screens === 1 ? "" : "s"} localized on canvas
              </p>
            </div>
          ) : (
            <div>
              <p style={styles.completeTitle}>Analysis complete</p>
              <p style={styles.completeMeta}>
                {LANGUAGE_LABEL[meta.language]} · {screenViews.length} screen
                {screenViews.length === 1 ? "" : "s"}
              </p>
            </div>
          )}
          <div style={styles.completeActions}>
            {previewActive ? (
              <>
                <button className="lpt-btn lpt-btn-secondary" onClick={exitPreview}>
                  Exit Preview
                </button>
                <button className="lpt-btn lpt-btn-primary" onClick={exportLocalized}>
                  Export
                </button>
                <button
                  className="lpt-btn lpt-btn-ghost"
                  onClick={newAnalysis}
                  title="Reset and start over"
                >
                  New Analysis
                </button>
              </>
            ) : (
              <>
                <button
                  className="lpt-btn lpt-btn-secondary"
                  onClick={recheck}
                  title="Re-scan these screens after fixing"
                >
                  Re-check
                </button>
                <button className="lpt-btn lpt-btn-ghost" onClick={enterPreview}>
                  Preview
                </button>
                <button className="lpt-btn lpt-btn-ghost" onClick={exportLocalized}>
                  Export
                </button>
                <button
                  className="lpt-btn lpt-btn-ghost"
                  onClick={newAnalysis}
                  title="Reset and start over"
                >
                  New Analysis
                </button>
              </>
            )}
          </div>
        </header>
      )}

      <div style={styles.content}>
        {navError && <p style={styles.navError}>{navError}</p>}
        {/* Transient confirmation — export complete / preview closed. */}
        {banner && <StatusBanner {...banner} onDismiss={() => setBanner(null)} />}
        {/* Results separated by language — each tab is that language's own analysis. */}
        {doneLangs.length > 1 && (
          <div style={styles.langTabs} role="tablist">
            {doneLangs.map((l) => (
              <button
                key={l}
                style={l === activeLang ? styles.langTabActive : styles.langTab}
                onClick={() => switchLanguage(l)}
              >
                {LANGUAGE_LABEL[l]}
              </button>
            ))}
          </div>
        )}
        {report &&
          (report.summary.totalIssues === 0 ? (
            <StatusView
              icon={<CheckIcon size={22} />}
              tone="positive"
              title="No issues found"
              description={`Every screen fits comfortably in ${LANGUAGE_LABEL[meta?.language ?? "hi"]}. You're ready to hand off.`}
              actionLabel="Export Localized Screens"
              onAction={exportLocalized}
              secondaryLabel="New Analysis"
              onSecondary={newAnalysis}
            />
          ) : (
            <div style={styles.results}>
              {/* One restrained anchor: the headline result, before the review lenses. */}
              {headline && (
                <div style={styles.anchor}>
                  <div style={styles.anchorHead}>
                    <span style={styles.anchorNum}>{headline.total}</span>
                    <span style={styles.anchorUnit}>finding{headline.total === 1 ? "" : "s"}</span>
                  </div>
                  <span style={styles.anchorSub}>
                    {headline.lead} {headline.label}
                  </span>
                </div>
              )}
              {/* Two review lenses over the SAME findings — pick by audience. */}
              <div style={styles.modeToggle} role="tablist">
                <button
                  style={reviewMode === "screens" ? styles.tabActive : styles.tab}
                  onClick={() => setReviewMode("screens")}
                  title="Review findings screen by screen"
                >
                  Screens
                </button>
                <button
                  style={reviewMode === "system" ? styles.tabActive : styles.tab}
                  onClick={() => setReviewMode("system")}
                  title="Review systemic fixes across the design system"
                >
                  Design System
                </button>
              </div>

              {reviewMode === "screens" ? (
                <ScreensView
                  views={screenViews}
                  openId={openScreenId}
                  onToggleScreen={toggleScreen}
                  onReveal={revealScreen}
                  onPreviewScreen={previewScreen}
                  onSeeFix={openSystemView}
                />
              ) : (
                <RootCausePanel
                  rootCauses={report.rootCauses}
                  issueById={issueById}
                  revealingCauseId={revealingCauseId}
                  onReveal={revealCause}
                  onExitReveal={exitReveal}
                  onGoToComponent={goToComponent}
                  onOpenScreen={openScreenFromSystem}
                />
              )}
            </div>
          ))}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: "Inter, system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    color: "var(--figma-color-text, #1e1e1e)",
  },
  complete: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "12px 16px",
    borderBottom: "1px solid var(--figma-color-border, #e5e5e5)",
  },
  completeTitle: { fontSize: 13, fontWeight: 600, margin: 0 },
  previewTitle: {
    fontSize: 13,
    fontWeight: 600,
    margin: 0,
    color: "var(--figma-color-text-brand, #0d99ff)",
  },
  completeMeta: { fontSize: 11, opacity: 0.7, margin: "2px 0 0" },
  completeActions: { display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
  content: { flex: 1, overflowY: "auto", padding: "8px 16px 20px" },
  langTabs: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
    borderBottom: "1px solid var(--figma-color-border, #ececec)",
  },
  langTab: {
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 2px",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "transparent",
    color: "inherit",
    opacity: 0.5,
    cursor: "pointer",
  },
  langTabActive: {
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 2px",
    border: "none",
    borderBottom: "2px solid var(--figma-color-border-brand, #0d99ff)",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
  },
  results: { display: "flex", flexDirection: "column", gap: 16 },
  anchor: { display: "flex", flexDirection: "column", gap: 2 },
  anchorHead: { display: "flex", alignItems: "baseline", gap: 8 },
  anchorNum: { fontSize: 22, fontWeight: 600, lineHeight: 1, letterSpacing: -0.5 },
  anchorUnit: { fontSize: 12, opacity: 0.55 },
  anchorSub: { fontSize: 11, opacity: 0.55 },
  modeToggle: {
    display: "flex",
    gap: 2,
    padding: 2,
    borderRadius: 8,
    background: "var(--figma-color-bg-secondary, #f0f0f0)",
  },
  tab: {
    flex: 1,
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "inherit",
    opacity: 0.7,
    cursor: "pointer",
  },
  tabActive: {
    flex: 1,
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 8px",
    borderRadius: 6,
    border: "none",
    background: "var(--figma-color-bg, #fff)",
    color: "inherit",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
  },
  clear: { fontSize: 12, padding: "0 8px 12px", color: "#2f9e44" },
  navError: {
    fontSize: 11,
    margin: "0 8px 8px",
    padding: "8px 8px",
    borderRadius: 6,
    background: "var(--figma-color-bg-warning-tertiary, #fff4e5)",
    color: "var(--figma-color-text-warning, #8a5a00)",
  },
};
