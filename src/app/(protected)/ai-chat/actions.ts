"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, user_id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[chat] getConversations error:", error.message);
    return [];
  }
  return (data ?? []) as Conversation[];
}

export async function getConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[chat] getConversationMessages error:", error.message);
    return [];
  }
  return (data ?? []) as ChatMessage[];
}

export async function createConversation(userId: string): Promise<{
  id?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title: "New conversation" })
    .select("id")
    .single();

  if (error) {
    console.error("[chat] createConversation error:", error.message);
    return { error: error.message };
  }
  revalidatePath("/ai-chat");
  return { id: data?.id };
}

export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("conversations")
    .update({ title: title.trim().slice(0, 200), updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[chat] updateConversationTitle error:", error.message);
    return { error: error.message };
  }
  revalidatePath("/ai-chat");
  return {};
}

export async function deleteConversation(
  conversationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[chat] deleteConversation error:", error.message);
    return { error: error.message };
  }
  revalidatePath("/ai-chat");
  return {};
}

export async function clearConversationMessages(
  conversationId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (error) {
    console.error("[chat] clearConversationMessages error:", error.message);
    return { error: error.message };
  }
  revalidatePath("/ai-chat");
  return {};
}

export async function saveChatMessage(
  conversationId: string,
  userId: string,
  role: "user" | "assistant",
  content: string
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[chat] saveChatMessage error:", error.message);
    return { error: error.message };
  }
  return { id: data?.id };
}
