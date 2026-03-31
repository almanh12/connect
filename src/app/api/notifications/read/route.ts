import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/security/parse-json";
import { notificationReadBodySchema } from "@/lib/security/schemas";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, notificationReadBodySchema);
    if (!parsed.ok) return parsed.response;
    const { id } = parsed.data;

    if (id.startsWith("event-reminder-") || id.startsWith("mandatory-")) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
