// Resolve the "screen" a node belongs to. A screen is the TOP-LEVEL frame (the
// outermost FRAME directly under the page) — what a designer calls an artboard.
// Using the *nearest* frame would split one screen into its inner cards/rows and
// defeat screen-level intelligence, so we walk all the way out to the page.

export interface ScreenInfo {
  pageId: string;
  pageName: string;
  frameId?: string; // absent when the node isn't inside any frame
  frameName?: string;
}

export function getScreenInfo(node: BaseNode): ScreenInfo {
  let frame: FrameNode | null = null;
  let page: PageNode | null = null;

  let cursor: BaseNode | null = node;
  while (cursor) {
    if (cursor.type === "FRAME") {
      frame = cursor; // keep overwriting → ends as the outermost frame before the page
    } else if (cursor.type === "PAGE") {
      page = cursor;
      break;
    }
    cursor = cursor.parent;
  }

  return {
    pageId: page?.id ?? "",
    pageName: page?.name ?? "",
    frameId: frame?.id,
    frameName: frame?.name,
  };
}
