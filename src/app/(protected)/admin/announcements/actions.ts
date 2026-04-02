"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AnnouncementPriority } from "@/lib/types";
import { isAdminRole } from "@/lib/roles";
import { parseActionInput } from "@/lib/security/parse-action";
import {
  announcementIdParamSchema,
  createAnnouncementBodySchema,
  updateAnnouncementBodySchema,
} from "@/lib/security/schemas";

export async function createAnnouncement(
  title: string,
  content: string,
  priority: AnnouncementPriority
) {
  const validated = parseActionInput(createAnnouncementBodySchema, {
    title,
    content,
    priority,
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

  if (!isAdminRole(profile?.role)) {
    return { error: "Unauthorized" };
  }
  if (!profile?.chapter_id) return { error: "No chapter" };

  const { title: t, content: c, priority: pr } = validated.data;

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      chapter_id: profile.chapter_id,
      title: t.trim(),
      content: c.trim(),
      user_id: user.id,
      is_pinned: false,
      priority: pr,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAnnouncement(
  id: string,
  title: string,
  content: string,
  priority: AnnouncementPriority
) {
  const validated = parseActionInput(updateAnnouncementBodySchema, {
    id,
    title,
    content,
    priority,
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

  if (!isAdminRole(profile?.role)) {
    return { error: "Unauthorized" };
  }

  const { id: aid, title: t, content: c, priority: pr } = validated.data;

  const { error } = await supabase
    .from("announcements")
    .update({
      title: t.trim(),
      content: c.trim(),
      priority: pr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", aid)
    .eq("chapter_id", profile?.chapter_id);

  if (error) return { error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const idParsed = parseActionInput(announcementIdParamSchema, id);
  if (!idParsed.ok) return { error: idParsed.error };

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

  if (!isAdminRole(profile?.role)) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", idParsed.data)
    .eq("chapter_id", profile?.chapter_id);

  if (error) return { error: error.message };
  revalidatePath("/admin/announcements");
  revalidatePath("/dashboard");
  return { success: true };
}
