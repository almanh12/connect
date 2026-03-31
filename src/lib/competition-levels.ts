/**
 * Ontario DECA competition levels.
 * District is not used in Ontario DECA and has been removed.
 */

export const COMPETITION_LEVELS = ["regional", "provincial", "icdc"] as const;
export type CompetitionLevel = (typeof COMPETITION_LEVELS)[number];

/** Display labels for UI */
export const LEVEL_DISPLAY: Record<string, string> = {
  regional: "Regionals",
  provincial: "Provincials",
  icdc: "ICDC",
};

/** Badge colors */
export const LEVEL_COLORS: Record<string, string> = {
  regional: "#2563eb",
  provincial: "#ca8a04",
  icdc: "#7c3aed",
};

/** Get display name for a competition level (handles legacy "district" as fallback) */
export function formatLevelDisplay(level: string | null | undefined): string {
  if (!level) return "—";
  const key = level.toLowerCase();
  return LEVEL_DISPLAY[key] ?? level;
}
