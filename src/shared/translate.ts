// Translation-stage vocabulary shared by both contexts. Hindi + Tamil are supported; every
// type is a union so more scripts plug in later without touching call sites.

export type Language = "hi" | "ta";

export const LANGUAGE_NAME: Record<Language, string> = { hi: "हिन्दी", ta: "தமிழ்" };
export const LANGUAGE_LABEL: Record<Language, string> = { hi: "Hindi", ta: "Tamil" };

// The visible generation stages. The user never sees "pipeline" — just these steps.
export type Stage =
  | "prepare"
  | "translating"
  | "building"
  | "layouts"
  | "checking"
  | "recommendations";

export const STAGE_ORDER: Stage[] = [
  "prepare",
  "translating",
  "building",
  "layouts",
  "checking",
  "recommendations",
];

export const STAGE_LABEL: Record<Stage, string> = {
  prepare: "Preparing text",
  translating: "Translating",
  building: "Building localized screens",
  layouts: "Updating layouts",
  checking: "Checking localization pressure",
  recommendations: "Generating recommendations",
};

/** Summary shown on completion. */
export interface GenMeta {
  language: Language;
  pageName: string;
  screens: number;
  strings: number;
  recommendations: number;
}
