import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseJsonBodyOrEmpty } from "@/lib/security/parse-json";
import { competitionPatchBodySchema } from "@/lib/security/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("chapter_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.chapter_id) {
      return NextResponse.json({ error: "No chapter" }, { status: 403 });
    }

    const isAdmin =
      profile.role === "owner" ||
      profile.role === "admin" ||
      profile.role === "officer" ||
      profile.role === "advisor";

    const parsed = await parseJsonBodyOrEmpty(request, competitionPatchBodySchema);
    if (!parsed.ok) return parsed.response;
    const { status: newStatus, partner_id } = parsed.data;

    const { data: existing } = await supabase
      .from("competition_registrations")
      .select("id, user_id, chapter_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.chapter_id !== profile.chapter_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canEdit = isAdmin || existing.user_id === user.id;
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (
      newStatus &&
      ["registered", "confirmed", "completed", "withdrawn"].includes(newStatus)
    ) {
      updates.status = newStatus;
    }
    if (partner_id !== undefined) {
      updates.partner_id = partner_id || null;
    }

    const { error } = await supabase
      .from("competition_registrations")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[competition] Update failed:", error.message);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[competition] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("chapter_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.chapter_id) {
      return NextResponse.json({ error: "No chapter" }, { status: 403 });
    }

    const isAdmin =
      profile.role === "owner" ||
      profile.role === "admin" ||
      profile.role === "officer" ||
      profile.role === "advisor";

    const { data: existing } = await supabase
      .from("competition_registrations")
      .select("id, user_id, chapter_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.chapter_id !== profile.chapter_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canDelete = isAdmin || existing.user_id === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("competition_registrations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[competition] Delete failed:", error.message);
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[competition] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
