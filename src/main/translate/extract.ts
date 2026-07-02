import { collectTextNodes } from "../traverse";

// Stage 1 — gather the UNIQUE source strings from the selection so the UI only
// translates each distinct label once. Reuses the frozen engine's collector.
export function extractStrings(roots: readonly SceneNode[]): {
  strings: string[];
  textNodeCount: number;
} {
  const nodes = collectTextNodes(roots);
  const set = new Set<string>();
  for (const n of nodes) {
    if (n.characters.trim().length > 0) set.add(n.characters);
  }
  return { strings: [...set], textNodeCount: nodes.length };
}
