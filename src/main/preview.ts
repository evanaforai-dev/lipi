import type { Language } from "../shared/translate";
import { applyTranslations } from "./translate/apply";

// Preview Mode — Approach E (clone swap). We NEVER mutate the user's original text.
// Instead: clone a screen, translate the clone, place it exactly over the original, and
// hide the original. Exit deletes the clones and unhides originals — the document returns
// to exactly its previous state. Clones are lazy (created per screen on first preview) and
// live in one locked, pluginData-tagged group so cleanup is automatic and crash-safe.

const PREVIEW_GROUP_NAME = "Localization Preview (temporary)";
const PREVIEW_TAG = "lpt-preview"; // on the group
const HIDDEN_TAG = "lpt-preview-hidden"; // on originals we hid

interface ScreenClone {
  cloneFrame: SceneNode;
  nodeMap: Map<string, string>; // original node id → clone node id
}

let active = false;
let translations: Record<string, string> = {};
let language: Language = "hi";
let group: GroupNode | null = null;
const screens = new Map<string, ScreenClone>(); // original screen frame id → clone
const hidden: SceneNode[] = [];
let savedViewport: { x: number; y: number; zoom: number } | null = null;
let savedSelection: readonly SceneNode[] = [];

export function configurePreview(t: Record<string, string>, l: Language): void {
  translations = t;
  language = l;
}

export function isPreviewActive(): boolean {
  return active;
}

function topLevelFrameOf(node: SceneNode): SceneNode {
  let cur: BaseNode = node;
  while (cur.parent && cur.parent.type !== "PAGE") cur = cur.parent;
  return cur as SceneNode;
}

export function enterPreview(): void {
  if (active) return;
  active = true;
  const c = figma.viewport.center;
  savedViewport = { x: c.x, y: c.y, zoom: figma.viewport.zoom };
  savedSelection = figma.currentPage.selection;
}

async function ensureScreenClone(originalNode: SceneNode): Promise<ScreenClone> {
  const screen = topLevelFrameOf(originalNode);
  const existing = screens.get(screen.id);
  if (existing) return existing;

  const clone = screen.clone();
  if (!group || group.removed) {
    group = figma.group([clone], figma.currentPage);
    group.name = PREVIEW_GROUP_NAME;
    group.expanded = false;
    group.locked = true;
    group.setPluginData(PREVIEW_TAG, "true");
  } else {
    group.appendChild(clone);
  }
  // Occupy the exact same position as the original (groups use page coordinates).
  if ("x" in clone && "x" in screen) {
    clone.x = screen.x;
    clone.y = screen.y;
  }

  await applyTranslations([clone], translations, language);

  // Hide the original (a reversible visibility toggle — never a text mutation).
  screen.visible = false;
  screen.setPluginData(HIDDEN_TAG, "true");
  hidden.push(screen);
  rememberPreviewPage(figma.currentPage.id);

  // Structure is identical after clone+translate, so descendants align by traversal order.
  const nodeMap = new Map<string, string>();
  nodeMap.set(screen.id, clone.id);
  if ("findAll" in screen && "findAll" in clone) {
    const o = screen.findAll(() => true);
    const c = clone.findAll(() => true);
    const n = Math.min(o.length, c.length);
    for (let i = 0; i < n; i++) nodeMap.set(o[i].id, c[i].id);
  }

  const entry: ScreenClone = { cloneFrame: clone, nodeMap };
  screens.set(screen.id, entry);
  return entry;
}

/** Ensure the clone for the node's screen exists; return the corresponding clone node id. */
export async function previewNode(originalNodeId: string): Promise<string | null> {
  const node = await figma.getNodeByIdAsync(originalNodeId);
  if (!node || node.removed || node.type === "PAGE" || node.type === "DOCUMENT") return null;
  const entry = await ensureScreenClone(node as SceneNode);
  return entry.nodeMap.get(originalNodeId) ?? null;
}

/** Map original node ids to clone node ids, cloning their screens on demand. */
export async function remapForReveal(nodeIds: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const id of nodeIds) {
    const cloneId = await previewNode(id);
    if (cloneId) out.push(cloneId);
  }
  return out;
}

export function exitPreview(): void {
  if (!active) return;
  if (group && !group.removed) group.remove();
  for (const o of hidden) {
    if (!o.removed) {
      o.visible = true;
      o.setPluginData(HIDDEN_TAG, "");
    }
  }
  if (savedViewport) {
    figma.viewport.center = { x: savedViewport.x, y: savedViewport.y };
    figma.viewport.zoom = savedViewport.zoom;
  }
  figma.currentPage.selection = savedSelection.filter((n) => !n.removed);

  active = false;
  group = null;
  screens.clear();
  hidden.length = 0;
  savedViewport = null;
  savedSelection = [];
}

// With dynamic page loading, other pages are not loaded until asked for, so the startup
// sweep only visits pages a preview actually touched. Their ids live on the document root.
const PREVIEW_PAGES_KEY = "lpt-preview-pages";

function rememberPreviewPage(pageId: string): void {
  const ids = new Set(figma.root.getPluginData(PREVIEW_PAGES_KEY).split(",").filter(Boolean));
  if (ids.has(pageId)) return;
  ids.add(pageId);
  figma.root.setPluginData(PREVIEW_PAGES_KEY, [...ids].join(","));
}

/** Startup / close recovery: delete any leftover preview group and unhide tagged originals. */
export async function cleanupPreviewArtifacts(): Promise<void> {
  const ids = new Set(figma.root.getPluginData(PREVIEW_PAGES_KEY).split(",").filter(Boolean));
  ids.add(figma.currentPage.id);
  for (const id of ids) {
    const page = await figma.getNodeByIdAsync(id);
    if (!page || page.type !== "PAGE") continue;
    await page.loadAsync();
    for (const child of [...page.children]) {
      if (child.getPluginData(PREVIEW_TAG) === "true") {
        if (!child.removed) child.remove();
      } else if (child.getPluginData(HIDDEN_TAG) === "true") {
        child.visible = true;
        child.setPluginData(HIDDEN_TAG, "");
      }
    }
  }
  figma.root.setPluginData(PREVIEW_PAGES_KEY, "");
  active = false;
  group = null;
  screens.clear();
  hidden.length = 0;
}
