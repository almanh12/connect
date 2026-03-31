import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatClient } from "./chat-client";
import type { Conversation } from "./actions";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Ask DECA-related questions and get AI-powered advice.",
};

export default async function AIChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  let conversations: Conversation[] = [];
  let userDisplayName: string | null = null;
  let userAvatarUrl: string | null = null;

  if (hasApiKey) {
    try {
      const [convRes, profileRes] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, user_id, title, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single(),
      ]);

      if (!convRes.error && convRes.data) {
        conversations = convRes.data as Conversation[];
      }
      if (!profileRes.error && profileRes.data) {
        userDisplayName = profileRes.data.full_name ?? null;
        userAvatarUrl = profileRes.data.avatar_url ?? null;
      }
    } catch {
      conversations = [];
    }
  }

  const displayName =
    userDisplayName ??
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "You";

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatClient
          initialConversations={conversations}
          hasApiKey={hasApiKey}
          userId={user.id}
          userDisplayName={displayName}
          userAvatarUrl={userAvatarUrl}
        />
      </div>
    </div>
  );
}
