"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdminRole } from "@/lib/roles";
import { parseActionInput } from "@/lib/security/parse-action";
import {
  createStrategiesBatchSchema,
  strategyStatusBodySchema,
  toggleActionStepBodySchema,
  updateStrategyDetailsBodySchema,
} from "@/lib/security/schemas";

export interface StrategyActionStep {
  text: string;
  completed: boolean;
  completed_at?: string | null;
}

export interface StrategyRecord {
  id: string;
  chapter_id: string;
  title: string;
  priority: string;
  tags: string[];
  problem_statement: string | null;
  action_steps: StrategyActionStep[];
  expected_impact: string | null;
  timeline: string | null;
  success_metrics: unknown[];
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  intake_data: Record<string, unknown>;
}

export async function getStrategies(): Promise<StrategyRecord[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role) || !profile.chapter_id) return [];

  const { data } = await supabase
    .from("strategies")
    .select("*")
    .eq("chapter_id", profile.chapter_id)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    chapter_id: r.chapter_id,
    title: r.title ?? "",
    priority: r.priority ?? "medium",
    tags: Array.isArray(r.tags) ? r.tags : [],
    problem_statement: r.problem_statement ?? null,
    action_steps: Array.isArray(r.action_steps) ? r.action_steps : [],
    expected_impact: r.expected_impact ?? null,
    timeline: r.timeline ?? null,
    success_metrics: Array.isArray(r.success_metrics) ? r.success_metrics : [],
    status: r.status ?? "new",
    due_date: r.due_date ?? null,
    assigned_to: r.assigned_to ?? null,
    created_at: r.created_at ?? "",
    updated_at: r.updated_at ?? "",
    intake_data: (r.intake_data as Record<string, unknown>) ?? {},
  }));
}

export async function getChapterOfficers(): Promise<
  { id: string; full_name: string | null; avatar_url: string | null }[]
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!profile?.chapter_id || !isAdminRole(profile.role)) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("chapter_id", profile.chapter_id)
    .in("role", ["owner", "admin", "officer", "advisor"])
    .order("full_name");

  return (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? null,
    avatar_url: p.avatar_url ?? null,
  }));
}

export async function createStrategies(strategies: {
  title: string;
  priority: string;
  tags: string[];
  problem_statement: string;
  action_steps: StrategyActionStep[];
  expected_impact: string;
  timeline: string;
  success_metrics: unknown[];
  intake_data: Record<string, unknown>;
}[]) {
  const validated = parseActionInput(createStrategiesBatchSchema, strategies);
  if (!validated.ok) return { error: validated.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role) || !profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const rows = validated.data.map((s) => ({
    chapter_id: profile.chapter_id,
    title: s.title,
    priority: s.priority,
    tags: s.tags,
    problem_statement: s.problem_statement || null,
    action_steps: s.action_steps,
    expected_impact: s.expected_impact || null,
    timeline: s.timeline || null,
    success_metrics: s.success_metrics,
    status: "new",
    intake_data: s.intake_data,
  }));

  const { error } = await supabase.from("strategies").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/admin/strategies");
  return { success: true };
}

export async function updateStrategyStatus(id: string, status: string) {
  const validated = parseActionInput(strategyStatusBodySchema, { id, status });
  if (!validated.ok) return { error: validated.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role) || !profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { id: sid, status: nextStatus } = validated.data;

  const { error } = await supabase
    .from("strategies")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", sid)
    .eq("chapter_id", profile.chapter_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/strategies");
  return { success: true };
}

export async function updateStrategyDetails(
  id: string,
  updates: {
    due_date?: string | null;
    assigned_to?: string | null;
    action_steps?: StrategyActionStep[];
  }
) {
  const validated = parseActionInput(updateStrategyDetailsBodySchema, {
    id,
    updates,
  });
  if (!validated.ok) return { error: validated.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role) || !profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { id: sid, updates: u } = validated.data;

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (u.due_date !== undefined) payload.due_date = u.due_date;
  if (u.assigned_to !== undefined) payload.assigned_to = u.assigned_to;
  if (u.action_steps !== undefined) payload.action_steps = u.action_steps;

  const { error } = await supabase
    .from("strategies")
    .update(payload)
    .eq("id", sid)
    .eq("chapter_id", profile.chapter_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/strategies");
  return { success: true };
}

export async function toggleActionStep(strategyId: string, stepIndex: number, completed: boolean) {
  const validated = parseActionInput(toggleActionStepBodySchema, {
    strategyId,
    stepIndex,
    completed,
  });
  if (!validated.ok) return { error: validated.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (!profile || !isAdminRole(profile.role) || !profile.chapter_id) {
    return { error: "Unauthorized" };
  }

  const { strategyId: sid, stepIndex: idx, completed: done } = validated.data;

  const { data: row } = await supabase
    .from("strategies")
    .select("action_steps")
    .eq("id", sid)
    .eq("chapter_id", profile.chapter_id)
    .single();

  if (!row) return { error: "Strategy not found" };

  const steps = Array.isArray(row.action_steps) ? [...row.action_steps] : [];
  const step = steps[idx] as StrategyActionStep | undefined;
  if (!step) return { error: "Step not found" };

  steps[idx] = {
    ...step,
    completed: done,
    completed_at: done ? new Date().toISOString() : null,
  };

  const { error } = await supabase
    .from("strategies")
    .update({ action_steps: steps, updated_at: new Date().toISOString() })
    .eq("id", sid)
    .eq("chapter_id", profile.chapter_id);

  if (error) return { error: error.message };

  revalidatePath("/admin/strategies");
  return { success: true };
}
