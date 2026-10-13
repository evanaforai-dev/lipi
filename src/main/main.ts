// SANDBOX entry point (compiled to dist/code.js).
// Has the `figma` API. No DOM, no React, NO network. Job: run the generation stages
// (extract → duplicate → apply → reflow), hand the translated frames to the FROZEN
// analysis engine exactly as if a designer had translated them, and route reveal/nav.
import type { UiToMain, MainToUi } from "../shared/messages";
import type { Report } from "../shared/types";
import type { Language } from "../shared/translate";
import { detectStaticIssues } from "./analysis";
import { assembleReport } from "./analysis/assemble";
import { diffReports } from "./diff";
import {
  configurePreview,
  enterPreview,
  exitPreview,
  isPreviewActive,
  previewNode,
  cleanupPreviewArtifacts,
} from "./preview";
import { exportLocalized } from "./export";
import { clearReveal, reveal } from "./reveal";
import { extractStrings } from "./translate/extract";
import {
  cloneForMeasurement,
  removeClones,
  remapIssuesToOriginal,
} from "./translate/page";
import { applyTranslations } from "./translate/apply";
import { captureLayout, verifyCapture } from "./delta/snapshot";
import { computeLayoutDelta, printDelta } from "./delta/compute";
import { createPressureIssues, dedupeIssues, printPressure } from "./delta/adapter";

const KEY_STORAGE = "gtranslate_key";
const ONBOARD_STORAGE = "onboarded";
let genCounter = 0;
// Verify Mode keeps the previous scan PER language (never persisted) so diffs never cross langs.
const previousReportByLang: Partial<Record<Language, Report>> = {};
// Per-language translations + the shared selection, reused by Preview and Export.
const translationsByLang: Partial<Record<Language, Record<string, string>>> = {};
let lastRootIds: string[] = [];

// Crash recovery: sweep any leftover preview artifacts before doing anything else.
void cleanupPreviewArtifacts();
figma.on("close", () => {
  if (isPreviewActive()) exitPreview();
});

figma.showUI(__html__, { width: 380, height: 560, themeColors: true });

function post(message: MainToUi): void {
  figma.ui.postMessage(message);
}

function pageOf(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;
  while (current && current.type !== "PAGE") current = current.parent;
  return current as PageNode | null;
}

// The full analysis pipeline for one language: clone → translate → measure → detect → assemble
// → diff. Shared by GENERATE (first run) and RECHECK (re-run after fixes, same selection).
// Leaves the document exactly as before; returns the report and the count of strings applied.
async function runAnalysis(
  roots: readonly SceneNode[],
  translations: Record<string, string>,
  language: Language,
): Promise<{ report: Report; strings: number }> {
  post({ type: "STAGE", stage: "building" });
  const { frames, cloneToOriginal } = cloneForMeasurement(roots);
  const baseline = captureLayout(frames);

  post({ type: "STAGE", stage: "layouts" });
  const strings = await applyTranslations(frames, translations, language);
  const localized = captureLayout(frames);
  verifyCapture(baseline, localized);
  const delta = computeLayoutDelta(baseline, localized);
  printDelta(delta);

  post({ type: "STAGE", stage: "checking" });
  const staticResult = detectStaticIssues(frames);
  const pressureIssues = createPressureIssues(delta);
  printPressure(delta);

  const issues = dedupeIssues([...staticResult.issues, ...pressureIssues]);
  remapIssuesToOriginal(issues, cloneToOriginal);

  // A "screen" is a frame the user SELECTED — see rootIds attribution.
  const rootIds = new Set(roots.map((r) => r.id));
  const scannedScreens = new Map(
    roots.map((r) => {
      const page = pageOf(r);
      return [r.id, { name: r.name, pageId: page?.id ?? "", pageName: page?.name ?? "" }];
    }),
  );

  removeClones(frames);

  post({ type: "STAGE", stage: "recommendations" });
  const report = await assembleReport(issues, {
    scanId: `gen-${++genCounter}`,
    createdAt: Date.now(),
    scannedNodes: staticResult.scannedNodes,
    scannedScreens,
    rootIds,
  });

  // Verify Mode: diff against the previous run of THIS language (node ids are stable).
  const prev = previousReportByLang[language];
  if (prev) {
    const { diff, resolvedIssues } = diffReports(prev, report);
    report.diff = diff;
    report.resolvedIssues = resolvedIssues;
  } else {
    for (const issue of report.issues) issue.status = "unchanged";
  }
  previousReportByLang[language] = report;
  translationsByLang[language] = translations;
  lastRootIds = roots.map((r) => r.id);

  return { report, strings };
}

// Surface any saved translation key + the onboarding flag to the UI on launch.
figma.clientStorage
  .getAsync(KEY_STORAGE)
  .then((k) => post({ type: "KEY_STATE", key: (k as string) ?? null }));
figma.clientStorage
  .getAsync(ONBOARD_STORAGE)
  .then((v) => post({ type: "ONBOARD_STATE", onboarded: v === true }));

figma.ui.onmessage = async (msg: UiToMain) => {
  switch (msg.type) {
    case "SAVE_KEY":
      await figma.clientStorage.setAsync(KEY_STORAGE, msg.key);
      post({ type: "KEY_STATE", key: msg.key });
      break;

    case "MARK_ONBOARDED":
      await figma.clientStorage.setAsync(ONBOARD_STORAGE, true);
      break;

    case "PREPARE": {
      const roots = figma.currentPage.selection;
      if (roots.length === 0) {
        post({ type: "PREPARE_ERROR", message: "Select some English frames first." });
        break;
      }
      post({ type: "STAGE", stage: "prepare" });
      const { strings, textNodeCount } = extractStrings(roots);
      post({ type: "PREPARE_RESULT", strings, textNodeCount, frameCount: roots.length });
      break;
    }

    case "GENERATE": {
      try {
        const roots = figma.currentPage.selection.slice();
        if (roots.length === 0) {
          post({ type: "GENERATE_ERROR", message: "Selection was lost — reselect and try again." });
          break;
        }
        clearReveal();
        const { report, strings } = await runAnalysis(roots, msg.translations, msg.language);
        post({
          type: "GENERATE_RESULT",
          report,
          meta: {
            language: msg.language,
            pageName: "",
            screens: roots.length,
            strings,
            recommendations: report.rootCauses.length,
          },
        });
      } catch (err) {
        post({
          type: "GENERATE_ERROR",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      break;
    }

    case "RECHECK": {
      // Re-run analysis on the SAME screens after the user has fixed things — reusing the cached
      // translations (no re-translate) so the delta reflects the new geometry. The diff shows
      // what got resolved, so the count visibly drops.
      try {
        const roots = (await Promise.all(lastRootIds.map((id) => figma.getNodeByIdAsync(id))))
          .filter(
            (n): n is SceneNode =>
              !!n && !n.removed && n.type !== "PAGE" && n.type !== "DOCUMENT",
          );
        const translations = translationsByLang[msg.language];
        if (roots.length === 0 || !translations) {
          post({ type: "GENERATE_ERROR", message: "Re-select your screens, then generate again." });
          break;
        }
        clearReveal();
        if (isPreviewActive()) {
          exitPreview();
          post({ type: "PREVIEW_STATE", active: false, language: null });
        }
        const { report } = await runAnalysis(roots, translations, msg.language);
        post({ type: "RECHECK_RESULT", report, language: msg.language });
      } catch (err) {
        post({
          type: "GENERATE_ERROR",
          message: err instanceof Error ? err.message : String(err),
        });
      }
      break;
    }

    case "PREVIEW_ENTER": {
      // Enter/switch Preview for ONE language: clone-swap the previewed screens IN PLACE over
      // the hidden originals so they simply become that language where they are. Switching
      // languages exits the current preview first, then re-enters with the new translations —
      // reusing the same preview implementation. No viewport move, no auto-reveal.
      const translations = translationsByLang[msg.language];
      if (!translations) {
        post({ type: "PREVIEW_STATE", active: false, language: null });
        break;
      }
      clearReveal();
      if (isPreviewActive()) exitPreview();
      configurePreview(translations, msg.language);
      enterPreview();
      for (const id of lastRootIds) await previewNode(id);
      post({ type: "PREVIEW_STATE", active: true, language: msg.language });
      break;
    }

    case "PREVIEW_EXIT": {
      clearReveal();
      exitPreview();
      post({ type: "PREVIEW_STATE", active: false, language: null });
      break;
    }

    case "EXPORT": {
      // Leave preview first so the originals are visible again — otherwise the exported
      // clones would inherit the hidden originals' visibility and land as an invisible section.
      if (isPreviewActive()) {
        exitPreview();
        post({ type: "PREVIEW_STATE", active: false, language: null });
      }
      const translations = translationsByLang[msg.language] ?? {};
      const count = await exportLocalized(lastRootIds, translations, msg.language);
      post({ type: "EXPORT_DONE", count, language: msg.language });
      break;
    }

    case "REVEAL": {
      // Reveal is the bridge from "assess" to "fix": if previewing, leave preview so the user
      // lands on the EDITABLE originals, then highlight them. (Preview shows the localized clones
      // you can't edit; Reveal takes you to the layer you actually change.)
      if (isPreviewActive()) {
        exitPreview();
        post({ type: "PREVIEW_STATE", active: false, language: null });
      }
      const count = await reveal(msg.checkId, msg.nodeIds);
      post({ type: "REVEAL_STATE", active: count > 0, count, checkId: msg.checkId });
      break;
    }

    case "EXIT_REVEAL": {
      clearReveal();
      post({ type: "REVEAL_STATE", active: false, count: 0, checkId: null });
      break;
    }

    case "GO_TO_COMPONENT": {
      // `found` means we actually navigated. It stays false for anything we can't reach —
      // a removed node, a non-component, or (most commonly) an external-library `remote`
      // component that lives outside this file. Everything is wrapped so a result is ALWAYS
      // posted; selecting an off-page node throws, and a thrown handler posts nothing.
      let found = false;
      try {
        let node: BaseNode | null;
        try {
          node = await figma.getNodeByIdAsync(msg.componentId);
        } catch {
          node = null;
        }
        const isComp =
          !!node && !node.removed && (node.type === "COMPONENT" || node.type === "COMPONENT_SET");
        const comp = isComp ? (node as ComponentNode | ComponentSetNode) : null;
        // Remote components are published from another file — there's nowhere to jump to here.
        if (comp && comp.remote !== true) {
          const page = pageOf(comp);
          if (page && page !== figma.currentPage) await figma.setCurrentPageAsync(page);
          // Only select/zoom if it truly lives on the current page now (else selection throws).
          if (pageOf(comp) === figma.currentPage) {
            figma.currentPage.selection = [comp];
            figma.viewport.scrollAndZoomIntoView([comp]);
            found = true;
          }
        }
      } catch {
        found = false;
      }
      post({ type: "GO_TO_COMPONENT_RESULT", found });
      break;
    }

    case "SELECT_NODE": {
      if (isPreviewActive()) {
        // Jump to the clone on the current page (locked group → zoom only, no select).
        const cloneId = await previewNode(msg.nodeId);
        const node = cloneId ? await figma.getNodeByIdAsync(cloneId) : null;
        const found = !!node && !node.removed && node.type !== "PAGE" && node.type !== "DOCUMENT";
        if (found) figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        post({ type: "SELECT_RESULT", nodeId: msg.nodeId, found });
        break;
      }
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      const found =
        !!node &&
        !node.removed &&
        "type" in node &&
        node.type !== "PAGE" &&
        node.type !== "DOCUMENT";
      if (found) {
        const sceneNode = node as SceneNode;
        // Only select nodes on the active page — switch pages first if needed.
        const page = pageOf(sceneNode);
        if (page && page !== figma.currentPage) await figma.setCurrentPageAsync(page);
        figma.currentPage.selection = [sceneNode];
        figma.viewport.scrollAndZoomIntoView([sceneNode]);
      }
      post({ type: "SELECT_RESULT", nodeId: msg.nodeId, found });
      break;
    }
  }
};
