import type { CheckId, ScriptId } from "./types";

// Reveal Mode palette — one colour per check. Shared so the UI group accent and the
// canvas overlay use exactly the same hex. (Per requirement: overflow=red,
// font-support=orange, line-height=purple, font-size=blue.)
export const CHECK_COLOR: Record<CheckId, string> = {
  overflow: "#E03E3E", // red
  "missing-font": "#D9822B", // orange
  "line-clip": "#8B5CF6", // purple
  "small-indic": "#0D99FF", // blue
};

// Human-readable check labels. Shared so root-cause titles (sandbox) and the issue
// group headers (UI) read identically.
export const CHECK_LABEL: Record<CheckId, string> = {
  overflow: "Overflow & truncation",
  "line-clip": "Line-height clipping",
  "missing-font": "Missing font / tofu",
  "small-indic": "Small Indic text",
};

// Unicode block ranges [start, end] (inclusive) per script. Range-based detection
// keeps us off a heavy i18n dependency. Add an entry to onboard another Indic script.
export const SCRIPT_RANGES: Record<ScriptId, [number, number][]> = {
  latin: [[0x0041, 0x024f]], // Basic Latin + Latin-1 Supplement + Extended-A
  devanagari: [[0x0900, 0x097f]], // Hindi, Marathi
  bengali: [[0x0980, 0x09ff]], // Bengali, Assamese
  tamil: [[0x0b80, 0x0bff]], // Tamil
};

// Tunable thresholds — checks read these instead of inlining magic numbers.
export const LINE_HEIGHT_MIN_RATIO = 1.4; // lineHeight/fontSize below this risks clipping stacked marks
export const MIN_INDIC_FONT_SIZE = 12; // Indic text smaller than this (px) is flagged
export const OVERFLOW_TOLERANCE_PX = 1; // ignore sub-pixel container overshoot
