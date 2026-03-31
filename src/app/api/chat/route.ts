import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkChatRateLimit, recordChatUsage } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/security/parse-json";
import { chatPostBodySchema } from "@/lib/security/schemas";

const MODEL = "claude-opus-4-6";

const CHAT_SYSTEM_PROMPT = `You are DECA Engage AI, a helpful assistant for DECA chapter members. You help with:
- Choosing competitive events
- Explaining DECA event formats and rules
- Practice tips and strategies
- Business concepts relevant to DECA competitions
- General DECA knowledge and advice
Keep responses concise, friendly, and encouraging. You are speaking to high school students preparing for DECA competitions.`;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[chat] ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "AI features are not configured. Contact your admin." },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = await parseJsonBody(request, chatPostBodySchema);
    if (!parsed.ok) return parsed.response;
    const { message, conversation_id } = parsed.data;

    const rateLimit = await checkChatRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        { status: 429 }
      );
    }

    const { data: history, error: historyErr } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (historyErr) console.warn("[chat] History fetch failed:", historyErr.message);

    const messages = (historyErr ? [] : history ?? []).reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    messages.push({ role: "user" as const, content: message.trim() });

    const { error: insertError } = await supabase.from("chat_messages").insert({
      conversation_id,
      user_id: user.id,
      role: "user",
      content: message.trim(),
    });

    if (insertError) {
      console.error("[chat] Failed to save user message:", insertError);
    }

    const { data: conv } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", conversation_id)
      .eq("user_id", user.id)
      .single();
    const isFirstMessage = !conv || conv.title === "New conversation";
    if (isFirstMessage) {
      const title = message.trim().slice(0, 50);
      await supabase
        .from("conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", conversation_id)
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversation_id)
        .eq("user_id", user.id);
    }

    const anthropic = new Anthropic({ apiKey });

    let content: string;
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: CHAT_SYSTEM_PROMPT,
        messages: messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const textBlock = response.content.find((b) => b.type === "text");
      content = textBlock?.type === "text" ? textBlock.text : "";
    } catch (anthropicErr) {
      console.error("[chat] Anthropic API error:", anthropicErr);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 503 }
      );
    }

    await recordChatUsage(user.id);

    if (content) {
      const { error: saveErr } = await supabase.from("chat_messages").insert({
        conversation_id,
        user_id: user.id,
        role: "assistant",
        content,
      });
      if (saveErr) {
        console.error("[chat] Failed to save assistant message:", saveErr);
      }
    }

    return NextResponse.json({ content: content || "" });
  } catch (err) {
    console.error("[chat] Unexpected error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
