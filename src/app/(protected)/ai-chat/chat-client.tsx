"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Plus,
  ArrowUp,
  Settings,
  MoreVertical,
  Pencil,
  Trash2,
  MessageSquareOff,
  Search,
  PanelLeft,
  Paperclip,
  Mic,
  Trophy,
  MessageSquare,
  CheckSquare,
  BarChart,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "./chat-markdown";
import type { Conversation, ChatMessage } from "./actions";
import {
  createConversation,
  getConversationMessages,
  updateConversationTitle,
  deleteConversation,
  clearConversationMessages,
} from "./actions";

const SUGGESTED_PROMPTS: {
  text: string;
  icon: LucideIcon;
  borderClass: string;
  iconClass: string;
}[] = [
  {
    text: "Pick a competition event for me",
    icon: Trophy,
    borderClass: "border-l-deca-blue",
    iconClass: "text-deca-blue",
  },
  {
    text: "Generate a roleplay case",
    icon: MessageSquare,
    borderClass: "border-l-deca-blue-dark",
    iconClass: "text-deca-blue-dark",
  },
  {
    text: "Quiz me on performance indicators",
    icon: CheckSquare,
    borderClass: "border-l-deca-blue-muted",
    iconClass: "text-deca-blue-muted",
  },
  {
    text: "What's my chapter's engagement looking like?",
    icon: BarChart,
    borderClass: "border-l-primary",
    iconClass: "text-primary",
  },
];

const MAX_TEXTAREA_ROWS = 6;
const LINE_HEIGHT_PX = 24;

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (date >= today) {
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  }
  if (date >= yesterday) return "Yesterday";
  if (diffMs < 7 * 24 * 3600000) return "This week";
  return "Older";
}

function groupConversationsByDate(convs: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; conversations: Conversation[] }[] = [
    { label: "Today", conversations: [] },
    { label: "Yesterday", conversations: [] },
    { label: "This Week", conversations: [] },
    { label: "Older", conversations: [] },
  ];

  for (const c of convs) {
    const d = new Date(c.updated_at);
    if (d >= today) groups[0].conversations.push(c);
    else if (d >= yesterday) groups[1].conversations.push(c);
    else if (d >= weekAgo) groups[2].conversations.push(c);
    else groups[3].conversations.push(c);
  }

  return groups.filter((g) => g.conversations.length > 0);
}

interface ChatClientProps {
  initialConversations: Conversation[];
  hasApiKey: boolean;
  userId: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
}

export function ChatClient({
  initialConversations,
  hasApiKey,
  userId,
}: ChatClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasUserSentMessageRef = useRef(false);
  const justLoadedMessagesRef = useRef(false);
  const skipLoadMessagesOnceForConvIdRef = useRef<string | null>(null);

  const resizeTextarea = useCallback(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxHeight = LINE_HEIGHT_PX * MAX_TEXTAREA_ROWS;
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const activeConv = conversations.find((c) => c.id === activeId);
  const filteredConvs = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;
  const grouped = groupConversationsByDate(filteredConvs);
  const hasMessages = messages.length > 0;
  const isEmptyState = !hasMessages && !loadingMessages;
  const canSend = input.trim().length > 0 && !isLoading;

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    justLoadedMessagesRef.current = true;
    const msgs = await getConversationMessages(convId);
    setMessages(msgs);
    setLoadingMessages(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (skipLoadMessagesOnceForConvIdRef.current === activeId) {
      return;
    }
    loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (hasUserSentMessageRef.current && container) {
      hasUserSentMessageRef.current = false;
      setTimeout(scrollToBottom, 50);
    } else if (justLoadedMessagesRef.current && messages.length > 0 && container) {
      setTimeout(scrollToBottom, 100);
    }
    justLoadedMessagesRef.current = false;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isLoading) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isLoading, scrollToBottom]);

  const handleNewChat = useCallback(async () => {
    const { id, error } = await createConversation(userId);
    if (error) {
      toast.error(error);
      return;
    }
    if (id) {
      const newConv: Conversation = {
        id,
        user_id: userId,
        title: "New conversation",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(id);
      setMessages([]);
      setMenuOpen(null);
      setDrawerOpen(false);
      inputRef.current?.focus();
    }
  }, [userId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewChat();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDrawerOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewChat]);

  const handleRename = async (convId: string, newTitle: string) => {
    const { error } = await updateConversationTitle(convId, newTitle);
    if (error) {
      toast.error(error);
      return;
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId ? { ...c, title: newTitle.slice(0, 200) } : c
      )
    );
    setMenuOpen(null);
    setEditingTitle(null);
  };

  const handleClearMessages = async () => {
    if (!activeId) return;
    const { error } = await clearConversationMessages(activeId);
    if (error) {
      toast.error(error);
      return;
    }
    setMessages([]);
    hasUserSentMessageRef.current = false;
    justLoadedMessagesRef.current = false;
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
    }
    setHeaderMenuOpen(false);
  };

  const handleDelete = async (convId: string) => {
    const { error } = await deleteConversation(convId);
    if (error) {
      toast.error(error);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      setActiveId(remaining[0]?.id ?? null);
    }
    setMenuOpen(null);
    setHeaderMenuOpen(false);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || !hasApiKey) return;

    let convId = activeId;
    if (!convId) {
      const { id, error } = await createConversation(userId);
      if (error || !id) {
        toast.error(error ?? "Failed to create conversation");
        return;
      }
      convId = id;
      skipLoadMessagesOnceForConvIdRef.current = id;
      const newConv: Conversation = {
        id,
        user_id: userId,
        title: "New conversation",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(id);
    }

    hasUserSentMessageRef.current = true;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantPlaceholder: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      const res = await fetch(`${window.location.origin}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversation_id: convId }),
        credentials: "same-origin",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          data?.error ??
          (res.status === 429
            ? "You've reached the message limit. Try again later."
            : res.status === 503
              ? "AI features are not configured. Contact your admin."
              : "Something went wrong. Please try again.");
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: errMsg,
          };
          return next;
        });
        toast.error(errMsg);
        return;
      }

      const fullContent = data?.content ?? "";
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: fullContent };
          return next;
        }
        if (fullContent) {
          return [
            {
              id: crypto.randomUUID(),
              role: "user",
              content: trimmed,
              created_at: new Date().toISOString(),
            },
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: fullContent,
              created_at: new Date().toISOString(),
            },
          ];
        }
        return next;
      });

      if (fullContent && convId) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const title =
              c.title === "New conversation"
                ? trimmed.slice(0, 50)
                : c.title;
            return { ...c, title, updated_at: new Date().toISOString() };
          })
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      toast.error(msg.length > 80 ? "Something went wrong. Please try again." : msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      if (skipLoadMessagesOnceForConvIdRef.current === convId) {
        skipLoadMessagesOnceForConvIdRef.current = null;
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestedClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
    resizeTextarea();
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-md">
          <p className="text-sm text-foreground">
            AI features are not configured. Contact your admin.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Settings className="h-4 w-4" />
            Go to settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-background">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="flex w-[280px] flex-col gap-0 p-0 sm:max-w-[280px]"
        >
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="text-left text-base font-semibold">
              Conversations
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-3 border-b border-border p-3">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="chat-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-lg border border-border bg-muted py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {grouped.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </div>
                {group.conversations.map((conv) => {
                  const isActive = conv.id === activeId;
                  return (
                    <div
                      key={conv.id}
                      className={cn(
                        "group relative mb-0.5 cursor-pointer rounded-xl px-3 py-2.5 transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        setActiveId(conv.id);
                        setDrawerOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <p className="truncate text-sm font-medium text-foreground">
                          {conv.title}
                        </p>
                        <span className="mt-0.5 shrink-0 text-[10px] text-muted-foreground">
                          {formatRelativeTime(conv.updated_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === conv.id ? null : conv.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {menuOpen === conv.id && (
                        <div
                          className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-border bg-popover py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTitle(conv.id);
                              setEditTitleValue(conv.title);
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(conv.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {editingTitle && (
            <div className="border-t border-border p-3">
              <input
                type="text"
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editTitleValue.trim()) {
                    handleRename(editingTitle, editTitleValue.trim());
                  }
                  if (e.key === "Escape") setEditingTitle(null);
                }}
                onBlur={() => {
                  if (editTitleValue.trim()) {
                    handleRename(editingTitle, editTitleValue.trim());
                  } else {
                    setEditingTitle(null);
                  }
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
                placeholder="Conversation title"
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          isEmptyState && "overflow-hidden"
        )}
      >
        <header
          className={cn(
            "flex shrink-0 items-center justify-between gap-3 border-b border-border px-4",
            isEmptyState ? "py-2" : "py-2.5"
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Open conversations"
            >
              <PanelLeft className="h-5 w-5" />
            </button>
            {hasMessages && activeConv && (
              <div className="min-w-0 flex-1">
                {editingTitle === activeId ? (
                  <input
                    type="text"
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={() => {
                      if (editTitleValue.trim() && activeId) {
                        handleRename(activeId, editTitleValue.trim());
                      }
                      setEditingTitle(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editTitleValue.trim() && activeId) {
                        handleRename(activeId, editTitleValue.trim());
                        setEditingTitle(null);
                      }
                    }}
                    className="min-w-[120px] border-b-2 border-primary bg-transparent text-sm font-semibold text-foreground focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => activeId && setEditingTitle(activeId)}
                    className="block truncate text-left text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {activeConv.title}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              ⌘K
            </kbd>
            {activeId && hasMessages && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Conversation options"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {headerMenuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-popover py-1 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTitle(activeId);
                        setEditTitleValue(activeConv?.title ?? "");
                        setHeaderMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={handleClearMessages}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                    >
                      <MessageSquareOff className="h-3.5 w-3.5" />
                      Clear messages
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(activeId)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete conversation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <div
          ref={chatContainerRef}
          className={cn(
            "min-h-0 flex-1 overflow-x-hidden scroll-smooth",
            isEmptyState ? "overflow-hidden" : "overflow-y-auto"
          )}
        >
          <div
            className={cn(
              "mx-auto w-full max-w-[720px] px-4",
              isEmptyState
                ? "flex min-h-full max-h-[min(80vh,calc(100vh-12rem))] flex-col justify-center py-2"
                : "py-6"
            )}
          >
            {loadingMessages ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : isEmptyState ? (
              <div className="relative flex w-full flex-col items-center text-center">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl"
                  style={{
                    background: `
                      radial-gradient(ellipse 85% 55% at 50% 15%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 65%),
                      radial-gradient(ellipse 55% 45% at 85% 55%, color-mix(in srgb, var(--deca-blue-light) 12%, transparent), transparent 60%),
                      radial-gradient(ellipse 50% 40% at 15% 75%, color-mix(in srgb, var(--deca-blue-muted) 8%, transparent), transparent 55%)
                    `,
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent shadow-[var(--shadow-brand)]">
                  <Image
                    src="/deca-engage-logo.png"
                    alt="DECA Engage"
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  How can I help with DECA today?
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Your competition coach for events, roleplays, performance indicators, and chapter insights.
                </p>
                <div className="mt-4 grid w-full max-w-lg grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.map((prompt) => {
                    const Icon = prompt.icon;
                    return (
                      <motion.button
                        key={prompt.text}
                        type="button"
                        onClick={() => handleSuggestedClick(prompt.text)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-2xl border border-border border-l-[3px] bg-card px-3 py-2.5 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-accent hover:shadow-[var(--shadow-brand)]",
                          prompt.borderClass
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent",
                            prompt.iconClass
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2} />
                        </span>
                        <span className="leading-snug">{prompt.text}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {messages.map((msg, i) => {
                  const prev = messages[i - 1];
                  const isNewTurn = i === 0 || prev?.role !== msg.role;
                  const marginTop = isNewTurn ? (i === 0 ? 0 : 24) : 8;
                  const showAssistantAvatar =
                    msg.role === "assistant" && isNewTurn;

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                      style={{ marginTop }}
                    >
                      {msg.role === "assistant" && (
                        <div
                          className={cn(
                            "mr-3 w-8 shrink-0",
                            showAssistantAvatar ? "visible" : "invisible"
                          )}
                          aria-hidden={!showAssistantAvatar}
                        >
                          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent">
                            <Image
                              src="/deca-engage-logo.png"
                              alt=""
                              width={20}
                              height={20}
                              className="object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {msg.role === "user" ? (
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      ) : msg.content ? (
                        <div className="min-w-0 flex-1 max-w-[calc(100%-2.75rem)]">
                          {msg.content.includes("unable to respond") &&
                          msg.content.includes("API credits") ? (
                            <p className="text-sm text-destructive">
                              <span className="mr-1.5" aria-hidden>
                                ⚠️
                              </span>
                              {msg.content}
                            </p>
                          ) : (
                            <ChatMarkdown content={msg.content} />
                          )}
                        </div>
                      ) : isLoading ? (
                        <ThinkingIndicator />
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-border bg-background px-4",
            isEmptyState ? "pb-3 pt-2" : "pb-5 pt-3"
          )}
        >
          <div className="mx-auto w-full max-w-[720px]">
            <form onSubmit={handleSubmit}>
              <div
                className={cn(
                  "ai-chat-input-box relative rounded-2xl border bg-card shadow-lg transition-all duration-200",
                  inputFocused
                    ? "border-primary/40 ring-2 ring-primary/15"
                    : "border-border"
                )}
              >
                <span className="pointer-events-none absolute left-4 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  DECA Engage AI
                </span>
                <div className="flex items-end gap-0.5 px-2 pb-2 pt-9">
                  <button
                    type="button"
                    disabled
                    className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                    aria-label="Attach file (coming soon)"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Ask anything about DECA..."
                    rows={1}
                    disabled={isLoading}
                    className="max-h-[144px] min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm leading-6 text-foreground shadow-none placeholder:text-muted-foreground outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled
                    className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
                    aria-label="Voice input (coming soon)"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!canSend}
                    className={cn(
                      "ai-chat-send-btn mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                      canSend
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                    aria-label="Send message"
                  >
                    <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
              <p
                className={cn(
                  "text-center text-xs text-muted-foreground",
                  isEmptyState ? "mt-1" : "mt-2"
                )}
              >
                Shift+Enter for newline
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="ai-thinking-bubble flex items-center gap-1 py-1" aria-label="Thinking">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}
