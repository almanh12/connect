import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const sessionIdSchema = z.string().uuid();

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[practice/delete] Unauthorized – no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";

    if (deleteAll) {
      console.log("[practice/delete] Delete all for user", user.id);
      const { data, error } = await supabase
        .from("practice_sessions")
        .delete()
        .eq("user_id", user.id)
        .select("id");

      if (error) {
        console.error("[practice/delete] Delete all failed:", error.message);
        return NextResponse.json(
          { error: "Could not delete practice sessions" },
          { status: 500 }
        );
      }
      console.log("[practice/delete] Deleted", data?.length ?? 0, "sessions");
      revalidatePath("/practice");
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Session id or all=true is required" },
        { status: 400 }
      );
    }

    const idCheck = sessionIdSchema.safeParse(id);
    if (!idCheck.success) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }

    console.log("[practice/delete] Delete session", id, "for user", user.id);
    const { data, error } = await supabase
      .from("practice_sessions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) {
      console.error("[practice/delete] Delete failed:", error.message);
      return NextResponse.json(
        { error: "Could not delete practice session" },
        { status: 500 }
      );
    }

    const deletedCount = data?.length ?? 0;
    if (deletedCount === 0) {
      console.error("[practice/delete] No rows deleted – RLS may be blocking. Session:", id);
      return NextResponse.json(
        { error: "Could not delete practice session (permission denied or not found)" },
        { status: 404 }
      );
    }
    console.log("[practice/delete] Successfully deleted session", id);
    revalidatePath("/practice");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Practice delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
