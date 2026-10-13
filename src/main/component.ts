// Maps a flagged node to the component instance it lives in (if any), so the UI
// can offer "Go To Component" and surface how many places one fix would touch.

export interface ComponentInfo {
  componentId: string; // main component node id
  componentName: string;
  instanceCount: number; // instances of this component on the current page (≥ 1)
}

/**
 * Count how many instances of each main component exist on the current page.
 * Built once per scan and shared across nodes so we don't re-traverse per issue.
 */
export async function buildInstanceCountMap(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const instances = figma.currentPage.findAllWithCriteria({ types: ["INSTANCE"] });
  for (const inst of instances) {
    const main = await inst.getMainComponentAsync();
    if (main) counts.set(main.id, (counts.get(main.id) ?? 0) + 1);
  }
  return counts;
}

/** Walk up from a node to its nearest enclosing instance's main component. */
export async function getComponentInfo(
  node: BaseNode,
  counts: Map<string, number>,
): Promise<ComponentInfo | null> {
  let current: BaseNode | null = node;
  while (current) {
    if (current.type === "INSTANCE") {
      const main = await current.getMainComponentAsync();
      if (!main) return null; // e.g. unresolved remote/library component
      return {
        componentId: main.id,
        componentName: main.name,
        instanceCount: counts.get(main.id) ?? 1,
      };
    }
    current = current.parent;
  }
  return null;
}
