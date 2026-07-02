// Collect TextNodes from the current selection and flatten them into plain,
// read-only snapshots. No canvas mutation, no font loading — purely observational.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LineHeightInfo {
  unit: "PIXELS" | "PERCENT" | "AUTO";
  value: number; // 0 when AUTO
}

export interface TextSnapshot {
  nodeId: string;
  nodeName: string;
  characters: string;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: LineHeightInfo;
  fontFamily: string;
  fontStyle: string;
  textAutoResize: "NONE" | "HEIGHT" | "WIDTH_AND_HEIGHT" | "TRUNCATE";
  hasMissingFont: boolean;
  bbox: Rect | null; // absolute bounds of the text node
  parentBbox: Rect | null; // absolute bounds of the parent
  parentClips: boolean; // parent.clipsContent — overflow gets cut here
  parentAutoLayout: boolean; // parent uses auto layout — informs the overflow fix
}

/** Walk the selection and return every visible TextNode. */
export function collectTextNodes(roots: readonly SceneNode[]): TextNode[] {
  const out: TextNode[] = [];
  for (const root of roots) {
    if (root.type === "TEXT") {
      out.push(root);
    } else if ("findAllWithCriteria" in root) {
      out.push(...root.findAllWithCriteria({ types: ["TEXT"] }));
    }
  }
  return out.filter((n) => n.visible);
}

// A styled property can be `figma.mixed` when the node has multiple styles.
// For the MVP we sample the first character — good enough to flag risk.
function firstFontSize(node: TextNode): number {
  return node.fontSize === figma.mixed ? node.getRangeFontSize(0, 1) as number : node.fontSize;
}

function firstFontName(node: TextNode): FontName {
  const fn = node.fontName;
  return fn === figma.mixed ? (node.getRangeFontName(0, 1) as FontName) : fn;
}

function firstLineHeight(node: TextNode): LineHeightInfo {
  const lh = node.lineHeight === figma.mixed ? node.getRangeLineHeight(0, 1) : node.lineHeight;
  if (lh === figma.mixed || lh.unit === "AUTO") return { unit: "AUTO", value: 0 };
  return { unit: lh.unit, value: lh.value };
}

function rectOf(node: SceneNode | BaseNode | null): Rect | null {
  if (node && "absoluteBoundingBox" in node && node.absoluteBoundingBox) {
    const b = node.absoluteBoundingBox;
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  }
  return null;
}

/** Read a node's relevant state. Returns null for empty text (nothing to check). */
export function extractSnapshot(node: TextNode): TextSnapshot | null {
  if (node.characters.length === 0) return null;
  const font = firstFontName(node);
  const parent = node.parent;
  return {
    nodeId: node.id,
    nodeName: node.name,
    characters: node.characters,
    width: node.width,
    height: node.height,
    fontSize: firstFontSize(node),
    lineHeight: firstLineHeight(node),
    fontFamily: font.family,
    fontStyle: font.style,
    textAutoResize: node.textAutoResize,
    hasMissingFont: node.hasMissingFont,
    bbox: rectOf(node),
    parentBbox: rectOf(parent),
    parentClips: !!parent && "clipsContent" in parent && parent.clipsContent === true,
    parentAutoLayout: !!parent && "layoutMode" in parent && parent.layoutMode !== "NONE",
  };
}
