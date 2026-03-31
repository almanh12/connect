import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/security/parse-json";
import { strategyImplementBodySchema } from "@/lib/security/schemas";
import { isAdminRole } from "@/lib/roles";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!isAdminRole(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, strategyImplementBodySchema);
    if (!parsed.ok) return parsed.response;
    const { strategy } = parsed.data;

    const { error } = await supabase.from("ai_strategies").insert({
      user_id: user.id,
      strategy_type: "engagement",
      content: JSON.stringify(strategy),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Implement strategy error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
