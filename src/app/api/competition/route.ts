import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseJsonBody } from "@/lib/security/parse-json";
import { competitionPostBodySchema } from "@/lib/security/schemas";

export async function GET() {
  try {
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

    const { data: regs, error } = await supabase
      .from("competition_registrations")
      .select(
        "id, user_id, event_code, event_name, competition_level, status, partner_id, created_at"
      )
      .eq("chapter_id", profile.chapter_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[competition] Fetch failed:", error.message);
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    const isAdmin =
      profile.role === "owner" ||
      profile.role === "admin" ||
      profile.role === "officer" ||
      profile.role === "advisor";

    const registrations = (regs ?? []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      event_code: r.event_code,
      event_name: r.event_name,
      competition_level: r.competition_level,
      status: r.status,
      partner_id: r.partner_id ?? null,
      created_at: r.created_at,
    }));

    return NextResponse.json({
      registrations,
      isAdmin,
    });
  } catch (err) {
    console.error("[competition] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    const parsed = await parseJsonBody(request, competitionPostBodySchema);
    if (!parsed.ok) return parsed.response;
    const { event_code, event_name, competition_level, partner_id, user_id } =
      parsed.data;

    const targetUserId = isAdmin && user_id ? user_id : user.id;
    const level = competition_level;

    if (isAdmin && user_id) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("chapter_id")
        .eq("id", user_id)
        .single();
      if (targetProfile?.chapter_id !== profile.chapter_id) {
        return NextResponse.json({ error: "User not in chapter" }, { status: 403 });
      }
    }

    const { data: inserted, error } = await supabase
      .from("competition_registrations")
      .insert({
        chapter_id: profile.chapter_id,
        user_id: targetUserId,
        event_code: event_code.trim(),
        event_name: event_name.trim(),
        competition_level: level,
        status: "registered",
        partner_id: partner_id || null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[competition] Insert failed:", error.message);
      return NextResponse.json({ error: "Failed to create registration" }, { status: 500 });
    }

    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return NextResponse.json({ id: inserted?.id });
  } catch (err) {
    console.error("[competition] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
