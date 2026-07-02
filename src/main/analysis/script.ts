import type { ScriptId } from "../../shared/types";
import { SCRIPT_RANGES } from "../../shared/constants";

const ENTRIES = Object.entries(SCRIPT_RANGES) as [ScriptId, [number, number][]][];

function scriptOf(codePoint: number): ScriptId | null {
  for (const [script, ranges] of ENTRIES) {
    for (const [start, end] of ranges) {
      if (codePoint >= start && codePoint <= end) return script;
    }
  }
  return null; // punctuation, digits, whitespace, emoji, unsupported scripts
}

/** Set of scripts present in a string, in a stable order. */
export function detectScripts(text: string): ScriptId[] {
  const found = new Set<ScriptId>();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    const s = scriptOf(cp);
    if (s) found.add(s);
  }
  return ENTRIES.map(([s]) => s).filter((s) => found.has(s));
}

/** True if any non-Latin (Indic) script is present. */
export function hasIndicScript(scripts: ScriptId[]): boolean {
  return scripts.some((s) => s !== "latin");
}
