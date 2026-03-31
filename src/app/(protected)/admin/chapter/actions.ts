"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseActionInput } from "@/lib/security/parse-action";
import {
  chapterIdParamSchema,
  updateChapterActionSchema,
} from "@/lib/security/schemas";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

export async function regenerateInviteCode(chapterId: string) {
  const idParsed = parseActionInput(chapterIdParamSchema, chapterId);
  if (!idParsed.ok) return { error: idParsed.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("role, chapter_id").eq("id", user.id).single();
  if (profile?.role !== "owner" || profile?.chapter_id !== idParsed.data) {
    return { error: "Only chapter owners can regenerate the invite code" };
  }

  let inviteCode = generateInviteCode();
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await supabase.from("chapters").select("id").eq("invite_code", inviteCode).maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const inviteLink = `${baseUrl}/join?code=${inviteCode}`;

  const { error } = await supabase
    .from("chapters")
    .update({ invite_code: inviteCode, invite_link: inviteLink })
    .eq("id", idParsed.data);
  if (error) return { error: error.message };
  revalidatePath("/admin/chapter");
  revalidatePath("/admin");
  return { success: true, inviteCode, inviteLink };
}

export async function deleteChapter(chapterId: string) {
  const idParsed = parseActionInput(chapterIdParamSchema, chapterId);
  if (!idParsed.ok) return { error: idParsed.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("role, chapter_id").eq("id", user.id).single();
  if (profile?.role !== "owner" || profile?.chapter_id !== idParsed.data) {
    return { error: "Only chapter owners can delete the chapter" };
  }

  // Remove all members from chapter
  await supabase
    .from("profiles")
    .update({ chapter_id: null, role: "member" })
    .eq("chapter_id", idParsed.data);
  const { error } = await supabase.from("chapters").delete().eq("id", idParsed.data);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/admin/chapter");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateChapter(
  chapterId: string,
  input: { name?: string; school_name?: string; advisor_name?: string }
) {
  const validated = parseActionInput(updateChapterActionSchema, {
    chapterId,
    input,
  });
  if (!validated.ok) return { error: validated.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, chapter_id")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") return { error: "Only chapter owners can edit" };

  const { chapterId: cid, input: patch } = validated.data;

  if (profile?.chapter_id !== cid) return { error: "Unauthorized" };

  const updates: Record<string, string | null> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.school_name !== undefined)
    updates.school_name = patch.school_name?.trim() || null;
  if (patch.advisor_name !== undefined)
    updates.advisor_name = patch.advisor_name?.trim() || null;

  const { error } = await supabase
    .from("chapters")
    .update(updates)
    .eq("id", cid);

  if (error) return { error: error.message };
  revalidatePath("/admin/chapter");
  revalidatePath("/admin");
  return { success: true };
}
