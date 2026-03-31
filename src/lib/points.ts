import type { SupabaseClient } from "@supabase/supabase-js";

/** Point values for engagement activities — only two sources */
export const POINT_VALUES = {
  /** Admin-verified event attendance */
  EVENT_ATTENDANCE: 10,
  /** AI-verified practice session completion */
  PRACTICE_SESSION: 5,
} as const;

/**
 * Tier structure — matches DB constraint (all lowercase).
 * Thresholds: 0-49 bronze, 50-149 silver, 150-299 gold, 300-499 platinum, 500+ diamond
 */
export const TIER_THRESHOLDS = [
  { name: "bronze", min: 0 },
  { name: "silver", min: 50 },
  { name: "gold", min: 150 },
  { name: "platinum", min: 300 },
  { name: "diamond", min: 500 },
] as const;

export type TierName = (typeof TIER_THRESHOLDS)[number]["name"];

/** Capitalize tier for display (e.g. "bronze" → "Bronze") */
export function formatTierForDisplay(tier: string): string {
  if (!tier) return "Bronze";
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

export interface TierInfo {
  name: TierName;
  color: string;
  next: TierName | null;
  nextThreshold: number | null;
  currentThreshold: number;
  progressPercent: number;
}

/** Get tier info from points. Progress shows advancement toward NEXT tier. */
export function getTier(points: number): TierInfo {
  if (points >= 500)
    return {
      name: "diamond",
      color: "#0077B6",
      next: null,
      nextThreshold: null,
      currentThreshold: 500,
      progressPercent: 100,
    };
  if (points >= 300)
    return {
      name: "platinum",
      color: "#E5E4E2",
      next: "diamond",
      nextThreshold: 500,
      currentThreshold: 300,
      progressPercent: Math.min(100, ((points - 300) / (500 - 300)) * 100),
    };
  if (points >= 150)
    return {
      name: "gold",
      color: "#FFD700",
      next: "platinum",
      nextThreshold: 300,
      currentThreshold: 150,
      progressPercent: Math.min(100, ((points - 150) / (300 - 150)) * 100),
    };
  if (points >= 50)
    return {
      name: "silver",
      color: "#C0C0C0",
      next: "gold",
      nextThreshold: 150,
      currentThreshold: 50,
      progressPercent: Math.min(100, ((points - 50) / (150 - 50)) * 100),
    };
  return {
    name: "bronze",
    color: "#CD7F32",
    next: "silver",
    nextThreshold: 50,
    currentThreshold: 0,
    progressPercent: Math.min(100, (points / 50) * 100),
  };
}

/** Get tier name from score (for backward compatibility) */
export function getTierForScore(score: number): TierName {
  return getTier(score).name;
}

/** Get progress to next tier: { currentTier, nextTier, pointsNeeded, progressPercent } */
export function getTierProgress(score: number) {
  const t = getTier(score);
  const pointsNeeded = t.nextThreshold != null ? t.nextThreshold - score : 0;
  return {
    currentTier: t.name,
    nextTier: t.next,
    pointsNeeded,
    progressPercent: t.progressPercent,
  };
}

/** Points for admin-verified attendance — always 10 */
export const ATTENDANCE_POINTS = POINT_VALUES.EVENT_ATTENDANCE;

/** Points for practice session completion — always 5 */
export const PRACTICE_POINTS = POINT_VALUES.PRACTICE_SESSION;

export type PointSource =
  | "event_attendance"
  | "practice_session"
  | "manual_bonus"
  | "recruitment"
  | "streak_bonus"
  | "mentorship";

/** Award points to a user and log to engagement_points */
export async function awardPoints(
  supabase: SupabaseClient,
  userId: string,
  points: number,
  source: PointSource,
  options?: {
    description?: string | null;
    referenceId?: string | null;
  }
): Promise<{ error?: string }> {
  if (points <= 0) return { error: "Points must be positive" };

  const { error } = await supabase.from("engagement_points").insert({
    user_id: userId,
    points,
    source,
    description: options?.description ?? null,
    reference_id: options?.referenceId ?? null,
  });

  if (error) return { error: error.message };
  return {};
}

/** Recalculate user's total score from engagement_points + manual_points and update tier in profiles */
export async function recalculateUserScore(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error?: string; score?: number; tier?: string }> {
  const [epRes, mpRes] = await Promise.all([
    supabase
      .from("engagement_points")
      .select("points")
      .eq("user_id", userId),
    supabase.from("manual_points").select("points").eq("user_id", userId),
  ]);

  if (epRes.error) return { error: epRes.error.message };
  if (mpRes.error) return { error: mpRes.error.message };

  const epSum = (epRes.data ?? []).reduce((s, r) => s + r.points, 0);
  const mpSum = (mpRes.data ?? []).reduce((s, r) => s + r.points, 0);
  const totalScore = epSum + mpSum;
  const tier = getTierForScore(totalScore);

  const { error } = await supabase
    .from("profiles")
    .update({ engagement_score: totalScore, tier })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { score: totalScore, tier };
}
