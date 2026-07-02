import type { Severity } from "./types";

// Deterministic prioritization — no AI, no randomness. The whole point is to answer
// "where should I start?" by ranking severity × how widely a fix would land.

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  error: 100,
  warning: 50,
  info: 10,
};

export type ImpactBand = "high" | "medium" | "low";

export const IMPACT_HIGH_MIN = 200; // high:   score ≥ 200
export const IMPACT_MEDIUM_MIN = 50; // medium: 50–199, low: < 50

/**
 * impactScore = severityWeight × component reach.
 * Reach is the instance count of the component the node belongs to (≥ 1; 1 when the
 * node isn't in a component). So an error in a component used 20× (100 × 20 = 2000)
 * ranks far above the same error used once (100 × 1 = 100).
 */
export function computeImpactScore(severity: Severity, instanceCount?: number): number {
  const reach = Math.max(instanceCount ?? 1, 1);
  return SEVERITY_WEIGHT[severity] * reach;
}

export function impactBand(score: number): ImpactBand {
  if (score >= IMPACT_HIGH_MIN) return "high";
  if (score >= IMPACT_MEDIUM_MIN) return "medium";
  return "low";
}
