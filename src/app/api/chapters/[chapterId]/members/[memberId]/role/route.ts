import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isOwner } from "@/lib/roles";
import { parseJsonBody } from "@/lib/security/parse-json";
import {
  chapterMemberRoleParamsSchema,
  memberRolePutBodySchema,
} from "@/lib/security/schemas";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ chapterId: string; memberId: string }> }
) {
  try {
    const raw = await params;
    const idsParsed = chapterMemberRoleParamsSchema.safeParse(raw);
    if (!idsParsed.success) {
      return NextResponse.json({ error: "Invalid chapter or member id" }, { status: 400 });
    }
    const { chapterId, memberId } = idsParsed.data;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("role, chapter_id")
      .eq("id", user.id)
      .single();

    if (!isOwner(requesterProfile?.role)) {
      return NextResponse.json(
        { error: "Only chapter owners can change member roles" },
        { status: 403 }
      );
    }

    if (requesterProfile?.chapter_id !== chapterId) {
      return NextResponse.json(
        { error: "Chapter not found or access denied" },
        { status: 403 }
      );
    }

    if (memberId === user.id) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const parsed = await parseJsonBody(_request, memberRolePutBodySchema);
    if (!parsed.ok) return parsed.response;
    const { role } = parsed.data;

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("chapter_id, role")
      .eq("id", memberId)
      .single();

    if (!targetProfile || targetProfile.chapter_id !== chapterId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetProfile.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change the owner's role" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error("Update member role error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
