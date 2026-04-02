"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getPublicAppOrigin } from "@/lib/public-origin";

const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

export async function lookupChapterByCode(inviteCode: string) {
  const supabase = await createClient();
  const code = inviteCode?.trim().toUpperCase();
  if (!code || code.length !== 6) return { error: "Invalid code", chapter: null };

  const { data: chapter, error } = await supabase
    .from("chapters")
    .select("id, name, school_name")
    .eq("invite_code", code)
    .maybeSingle();

  if (error) return { error: error.message, chapter: null };
  if (!chapter) return { error: "Chapter not found", chapter: null };
  return { chapter: { id: chapter.id, name: chapter.name, school_name: chapter.school_name }, error: null };
}

export async function createChapter(input: {
  name: string;
  school_name: string;
  advisor_name: string;
  description?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!input.name?.trim()) return { error: "Chapter name is required" };
  if (!input.school_name?.trim()) return { error: "School name is required" };

  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("chapters")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const inviteLink = `${getPublicAppOrigin()}/join?code=${inviteCode}`;

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .insert({
      name: input.name.trim(),
      school_name: input.school_name.trim(),
      advisor_name: input.advisor_name?.trim() || null,
      invite_code: inviteCode,
      invite_link: inviteLink,
      owner_id: user.id,
    })
    .select("id")
    .single();

  if (chapterError) return { error: chapterError.message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      chapter_id: chapter.id,
      role: "owner",
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  revalidatePath("/");
  return { success: true, inviteCode, inviteLink };
}

export async function joinChapter(inviteCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const code = inviteCode?.trim().toUpperCase();
  if (!code || code.length !== 6) return { error: "Enter a valid 6-character invite code" };

  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();

  if (chapterError) return { error: chapterError.message };
  if (!chapter) return { error: "Invalid invite code" };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      chapter_id: chapter.id,
      role: "member",
    })
    .eq("id", user.id);

  if (profileError) return { error: profileError.message };

  const { data: chapterData } = await supabase
    .from("chapters")
    .select("name")
    .eq("id", chapter.id)
    .single();

  revalidatePath("/");
  return { success: true, chapterName: chapterData?.name ?? "your chapter" };
}
