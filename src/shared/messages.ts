// The typed contract between the two plugin contexts.
// Imported by BOTH src/main (sandbox) and src/ui (iframe) so the compiler keeps
// the two sides in sync. Pure types only — no `figma`, no DOM.
import type { CheckId, Report } from "./types";
import type { GenMeta, Language, Stage } from "./translate";

// ── Messages sent FROM the UI TO the sandbox ────────────────────────────────
export type UiToMain =
  | { type: "SAVE_KEY"; key: string } // persist the translation key in clientStorage
  | { type: "PREPARE"; language: Language } // extract unique source strings from selection
  | { type: "GENERATE"; language: Language; translations: Record<string, string> }
  | { type: "RECHECK"; language: Language } // re-run on the same screens after fixes (cached translations)
  | { type: "PREVIEW_ENTER"; language: Language } // clone-swap preview for one language
  | { type: "PREVIEW_EXIT" } // leave preview, restore originals
  | { type: "EXPORT"; language: Language } // permanently create localized copies for one language
  | { type: "SELECT_NODE"; nodeId: string }
  | { type: "REVEAL"; checkId: CheckId; nodeIds: string[] }
  | { type: "EXIT_REVEAL" }
  | { type: "GO_TO_COMPONENT"; componentId: string }
  | { type: "MARK_ONBOARDED" }; // persist that the user has run their first analysis

// ── Messages sent FROM the sandbox TO the UI ────────────────────────────────
export type MainToUi =
  | { type: "KEY_STATE"; key: string | null }
  | { type: "ONBOARD_STATE"; onboarded: boolean } // whether onboarding has been completed

  | { type: "PREPARE_RESULT"; strings: string[]; textNodeCount: number; frameCount: number }
  | { type: "PREPARE_ERROR"; message: string }
  | { type: "STAGE"; stage: Stage } // a sandbox-owned stage has started
  | { type: "GENERATE_RESULT"; report: Report; meta: GenMeta }
  | { type: "RECHECK_RESULT"; report: Report; language: Language } // re-check result (updates in place)
  | { type: "GENERATE_ERROR"; message: string }
  | { type: "REVEAL_STATE"; active: boolean; count: number; checkId: CheckId | null }
  | { type: "SELECT_RESULT"; nodeId: string; found: boolean }
  | { type: "GO_TO_COMPONENT_RESULT"; found: boolean }
  | { type: "PREVIEW_STATE"; active: boolean; language: Language | null }
  | { type: "EXPORT_DONE"; count: number; language: Language };
