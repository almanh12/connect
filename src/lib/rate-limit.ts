/**
 * Rate limiting for AI features using api_usage table.
 * Chat: max 20 messages per user per hour
 * Practice evaluation: max 5 per user per day
 */

import { createClient } from "@/lib/supabase/server";

const CHAT_LIMIT = 20;
const CHAT_WINDOW_HOURS = 1;
const EVAL_LIMIT = 5;
const EVAL_WINDOW_HOURS = 24;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; error: string };

export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = await createClient();
  const since = new Date();
  since.setHours(since.getHours() - CHAT_WINDOW_HOURS);

  const { count, error } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "chat")
    .gte("created_at", since.toISOString());

  if (error) {
    console.error("[rate-limit] Chat count error:", error);
    return { allowed: true }; // Fail open on DB error
  }

  if ((count ?? 0) >= CHAT_LIMIT) {
    return {
      allowed: false,
      error: "You've reached the message limit. Try again later.",
    };
  }
  return { allowed: true };
}

export async function checkPracticeEvalRateLimit(
  userId: string
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const since = new Date();
  since.setHours(since.getHours() - EVAL_WINDOW_HOURS);

  const { count, error } = await supabase
    .from("api_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "practice_eval")
    .gte("created_at", since.toISOString());

  if (error) {
    console.error("[rate-limit] Practice eval count error:", error);
    return { allowed: true }; // Fail open on DB error
  }

  if ((count ?? 0) >= EVAL_LIMIT) {
    return {
      allowed: false,
      error: "You've reached the evaluation limit. Try again tomorrow.",
    };
  }
  return { allowed: true };
}

export async function recordChatUsage(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("api_usage").insert({
    user_id: userId,
    action: "chat",
  });
}

export async function recordPracticeEvalUsage(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("api_usage").insert({
    user_id: userId,
    action: "practice_eval",
  });
}
