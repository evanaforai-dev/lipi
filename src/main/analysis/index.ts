import type { Issue } from "../../shared/types";
import { collectTextNodes, extractSnapshot } from "../traverse";
import { getScreenInfo } from "../screen";
import type { ScannedScreen } from "./screens";
import { detectScripts, hasIndicScript } from "./script";
import type { Check } from "./checks/types";
import { overflowCheck } from "./checks/overflow";
import { lineHeightCheck } from "./checks/lineHeight";
import { fontSupportCheck } from "./checks/fontSupport";
import { fontSizeCheck } from "./checks/fontSize";

const CHECKS: Check[] = [overflowCheck, lineHeightCheck, fontSupportCheck, fontSizeCheck];

// Diagnostic trace — flip to false to silence. Logs to the Figma dev console
// (Plugins → Development → Open console).
const DEBUG = true;
function log(...args: unknown[]): void {
  if (DEBUG) console.log(...args);
}

export interface StaticResult {
  issues: Issue[];
  scannedNodes: number;
  scannedScreens: Map<string, ScannedScreen>;
}

/**
 * STATIC DETECTION STAGE. Traverse the given roots, run the static checks, and return raw
 * Issues + the scanned-screen set. Takes roots explicitly so it never depends on (or
 * mutates) the page selection. It does NOT assemble — the caller combines these with the
 * Delta Engine and hands the union to assembleReport.
 */
export function detectStaticIssues(roots: readonly SceneNode[]): StaticResult {
  const nodes = collectTextNodes(roots);
  const issues: Issue[] = [];
  let hindiCount = 0;
  // Every screen containing scanned text — so clean screens (0 issues) still appear.
  const scannedScreens = new Map<string, ScannedScreen>();

  if (DEBUG) {
    const allText: TextNode[] = roots.flatMap((r) =>
      r.type === "TEXT"
        ? [r]
        : "findAllWithCriteria" in r
          ? r.findAllWithCriteria({ types: ["TEXT"] })
          : [],
    );
    const visited = roots.reduce(
      (sum, r) => sum + 1 + ("findAll" in r ? r.findAll(() => true).length : 0),
      0,
    );
    log("========== LPT ANALYSIS TRACE ==========");
    log("Page:", figma.currentPage.name);
    log(
      "Frames scanned:",
      roots.length,
      roots.map((r) => `"${r.name}" [${r.type}]`),
    );
    log("Nodes visited:", visited);
    log("Text layers found (incl. hidden):", allText.length);
    log("Text layers analyzed (visible):", nodes.length);
    for (const t of allText) {
      if (!t.visible) log(`  SKIP "${t.name}" — hidden`);
    }
    log("----------------------------------------");
  }

  for (const node of nodes) {
    const snap = extractSnapshot(node);
    if (!snap) {
      log(`  SKIP "${node.name}" — empty text (no characters)`);
      continue;
    }
    const scripts = detectScripts(snap.characters);
    if (scripts.includes("devanagari")) hindiCount++;
    const screen = getScreenInfo(node);
    if (screen.frameId && !scannedScreens.has(screen.frameId)) {
      scannedScreens.set(screen.frameId, {
        name: screen.frameName ?? "Frame",
        pageId: screen.pageId,
        pageName: screen.pageName,
      });
    }

    if (DEBUG) {
      const lh =
        snap.lineHeight.unit === "AUTO"
          ? "AUTO"
          : `${snap.lineHeight.unit}:${snap.lineHeight.value}`;
      log(`NODE "${snap.nodeName}"`);
      log(`  text:   "${snap.characters.slice(0, 30)}"`);
      log(`  script: [${scripts.join(", ") || "none"}]  indic=${hasIndicScript(scripts)}`);
      log(`  font:   ${snap.fontFamily} / ${snap.fontStyle}  size=${snap.fontSize}  lineHeight=${lh}`);
      log(
        `  layout: autoResize=${snap.textAutoResize}  parentClips=${snap.parentClips}  parentAutoLayout=${snap.parentAutoLayout}  hasMissingFont=${snap.hasMissingFont}`,
      );
      log(
        `  checks: overflow=${!!overflowCheck(snap, scripts)}  clipping=${!!lineHeightCheck(snap, scripts)}  missingFont=${!!fontSupportCheck(snap, scripts)}  smallType=${!!fontSizeCheck(snap, scripts)}`,
      );
    }

    for (const check of CHECKS) {
      const found = check(snap, scripts);
      if (found) issues.push(found);
    }
  }

  if (DEBUG) {
    const visited = roots.reduce(
      (sum, r) => sum + 1 + ("findAll" in r ? r.findAll(() => true).length : 0),
      0,
    );
    log("============ STATIC DETECTION ============");
    log("Frames scanned:   ", roots.length);
    log("Nodes visited:    ", visited);
    log("Text nodes:       ", nodes.length);
    log("Hindi text nodes: ", hindiCount);
    log("Static findings:  ", issues.length);
    log("==========================================");
  }

  return { issues, scannedNodes: nodes.length, scannedScreens };
}
