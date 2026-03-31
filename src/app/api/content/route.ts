import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/security/parse-json";
import { contentPostBodySchema } from "@/lib/security/schemas";
import { isAdminRole } from "@/lib/roles";

const MODEL = "claude-opus-4-6";

const PLATFORMS = ["Instagram", "TikTok", "Email", "General"] as const;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured" },
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!isAdminRole(profile?.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, contentPostBodySchema);
    if (!parsed.ok) return parsed.response;
    const { prompt, platform } = parsed.data;

    const platformKey = PLATFORMS.includes(platform as (typeof PLATFORMS)[number])
      ? platform
      : "General";

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const systemPrompt = `You are a DECA chapter marketing assistant. Generate engaging content for promoting chapter events and activities.

Based on the user's input, create:
1. A social media caption (with emojis and relevant hashtags like #DECA #DECAEngage)
2. An email template (subject line + body, professional but friendly)
3. A short recruitment message (for inviting new members)

Format your response as JSON with these keys:
- "caption": the social media post
- "email_subject": subject line
- "email_body": email body text
- "recruitment_message": short message for recruitment

Return ONLY valid JSON, no other text.`;

    const platformHint =
      platformKey === "Instagram"
        ? "Optimize for Instagram (visual, hashtags, emojis)"
        : platformKey === "TikTok"
          ? "Optimize for TikTok (casual, trending style)"
          : platformKey === "Email"
            ? "Optimize for email (clear subject, scannable body)"
            : "Make it versatile for any platform";

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Platform: ${platformKey}. ${platformHint}.\n\nWhat we're promoting: ${prompt.trim()}\n\nGenerate the content. Return ONLY a JSON object.`,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "{}";
    let content: {
      caption?: string;
      email_subject?: string;
      email_body?: string;
      recruitment_message?: string;
    };
    try {
      content = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    } catch {
      content = {};
    }

    return NextResponse.json({
      caption: content.caption ?? "",
      emailSubject: content.email_subject ?? "",
      emailBody: content.email_body ?? "",
      recruitmentMessage: content.recruitment_message ?? "",
    });
  } catch (err) {
    console.error("Content API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
