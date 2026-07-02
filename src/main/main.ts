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
  remapForReveal,
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
let genCounter = 0;
// Verify Mode keeps only the previous scan in memory (never persisted).
let previousReport: Report | null = null;
// Last generation's inputs — reused by Preview and Export.
let lastTranslations: Record<string, string> = {};
let lastLanguage: Language = "hi";
let lastRootIds: string[] = [];

// Crash recovery: sweep any leftover preview artifacts before doing anything else.
cleanupPreviewArtifacts();
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

// Surface any saved translation key to the UI on launch.
figma.clientStorage
  .getAsync(KEY_STORAGE)
  .then((k) => post({ type: "KEY_STATE", key: (k as string) ?? null }));

figma.ui.onmessage = async (msg: UiToMain) => {
  switch (msg.type) {
    case "SAVE_KEY":
      await figma.clientStorage.setAsync(KEY_STORAGE, msg.key);
      post({ type: "KEY_STATE", key: msg.key });
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

        post({ type: "STAGE", stage: "building" });
        // Temporary in-place clones (never a saved page). Analyzed, then deleted.
        const { frames, cloneToOriginal } = cloneForMeasurement(roots);
        // Baseline = the cloned English layout, before any translation.
        const baseline = captureLayout(frames);

        post({ type: "STAGE", stage: "layouts" });
        const strings = await applyTranslations(frames, msg.translations, msg.language);
        // Localized = the same nodes after translation reflowed (reflow is synchronous).
        const localized = captureLayout(frames);
        verifyCapture(baseline, localized); // capture summary
        const delta = computeLayoutDelta(baseline, localized);
        printDelta(delta);

        post({ type: "STAGE", stage: "checking" });
        // Analyze the in-place clones directly — never touch the user's selection.
        const staticResult = detectStaticIssues(frames);
        const pressureIssues = createPressureIssues(delta);
        printPressure(delta);

        // Re-key every finding to the ORIGINAL design nodes, then discard the clones so the
        // document is left exactly as before. Reveal/Verify then operate on the real layers.
        const issues = dedupeIssues([...staticResult.issues, ...pressureIssues]);
        remapIssuesToOriginal(issues, cloneToOriginal);

        // A "screen" is a frame the user SELECTED — not the outermost frame. When screens are
        // nested inside a wrapper frame, the outermost-frame rule would lump them into one; the
        // selection is the source of truth (header says "N screens" = N roots).
        const rootIds = new Set(roots.map((r) => r.id));
        const scannedScreens = new Map(
          roots.map((r) => {
            const page = pageOf(r);
            return [r.id, { name: r.name, pageId: page?.id ?? "", pageName: page?.name ?? "" }];
          }),
        );

        removeClones(frames);

        post({ type: "STAGE", stage: "recommendations" });
        const report = assembleReport(issues, {
          scanId: `gen-${++genCounter}`,
          createdAt: Date.now(),
          scannedNodes: staticResult.scannedNodes,
          scannedScreens,
          rootIds,
        });

        // Verify Mode: diff against the previous run. Original node ids are stable across
        // regenerations, so the diff is meaningful.
        if (previousReport) {
          const { diff, resolvedIssues } = diffReports(previousReport, report);
          report.diff = diff;
          report.resolvedIssues = resolvedIssues;
        } else {
          for (const issue of report.issues) issue.status = "unchanged";
        }
        previousReport = report;

        // Remember inputs so Preview / Export can reuse them without re-translating.
        lastTranslations = msg.translations;
        lastLanguage = msg.language;
        lastRootIds = roots.map((r) => r.id);
        configurePreview(msg.translations, msg.language);

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

    case "PREVIEW_ENTER": {
      // Enter Preview: localize the previewed screens IN PLACE (clone-swap over hidden
      // originals) so the designer's existing screens simply become Hindi where they are.
      // The viewport is NOT moved and no issue is auto-revealed — navigation happens only
      // when the user clicks Reveal.
      clearReveal();
      enterPreview();
      for (const id of lastRootIds) await previewNode(id);
      post({ type: "PREVIEW_STATE", active: true });
      break;
    }

    case "PREVIEW_EXIT": {
      clearReveal();
      exitPreview();
      post({ type: "PREVIEW_STATE", active: false });
      break;
    }

    case "EXPORT": {
      // Leave preview first so the originals are visible again — otherwise the exported
      // clones would inherit the hidden originals' visibility and land as an invisible section.
      if (isPreviewActive()) {
        exitPreview();
        post({ type: "PREVIEW_STATE", active: false });
      }
      const count = await exportLocalized(lastRootIds, lastTranslations, lastLanguage);
      post({ type: "EXPORT_DONE", count });
      break;
    }

    case "REVEAL": {
      // In preview, overlays go on the translated clones (created lazily), not the hidden
      // originals — and the revealed nodes pulse. Outside preview, behaves exactly as today.
      const preview = isPreviewActive();
      const nodeIds = preview ? await remapForReveal(msg.nodeIds) : msg.nodeIds;
      const count = reveal(msg.checkId, nodeIds, preview);
      post({ type: "REVEAL_STATE", active: count > 0, count, checkId: msg.checkId });
      break;
    }

    case "EXIT_REVEAL": {
      clearReveal();
      post({ type: "REVEAL_STATE", active: false, count: 0, checkId: null });
      break;
    }

    case "GO_TO_COMPONENT": {
      const node = figma.getNodeById(msg.componentId);
      const found = !!node && !node.removed && "type" in node && node.type === "COMPONENT";
      if (found) {
        const comp = node as ComponentNode;
        const page = pageOf(comp);
        if (page && page !== figma.currentPage) figma.currentPage = page;
        figma.currentPage.selection = [comp];
        figma.viewport.scrollAndZoomIntoView([comp]);
      }
      post({ type: "GO_TO_COMPONENT_RESULT", found });
      break;
    }

    case "SELECT_NODE": {
      if (isPreviewActive()) {
        // Jump to the clone on the current page (locked group → zoom only, no select).
        const cloneId = await previewNode(msg.nodeId);
        const node = cloneId ? figma.getNodeById(cloneId) : null;
        const found = !!node && !node.removed && node.type !== "PAGE" && node.type !== "DOCUMENT";
        if (found) figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
        post({ type: "SELECT_RESULT", nodeId: msg.nodeId, found });
        break;
      }
      const node = figma.getNodeById(msg.nodeId);
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
        if (page && page !== figma.currentPage) figma.currentPage = page;
        figma.currentPage.selection = [sceneNode];
        figma.viewport.scrollAndZoomIntoView([sceneNode]);
      }
      post({ type: "SELECT_RESULT", nodeId: msg.nodeId, found });
      break;
    }
  }
};
