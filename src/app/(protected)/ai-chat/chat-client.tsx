"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowUp,
  Settings,
  MoreVertical,
  Pencil,
  Trash2,
  MessageSquareOff,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { DiamondIcon } from "@/components/diamond-icon";
import { Avatar } from "@/components/avatar";
import type { Conversation, ChatMessage } from "./actions";
import {
  createConversation,
  getConversationMessages,
  updateConversationTitle,
  deleteConversation,
  clearConversationMessages,
} from "./actions";

const SUGGESTED_PROMPTS = [
  { text: "Help me pick a competitive event", emoji: "🎯" },
  { text: "Explain a DECA event format", emoji: "📋" },
  { text: "Give me practice tips", emoji: "💡" },
  { text: "Review my presentation strategy", emoji: "🏆" },
];

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
  userDisplayName,
  userAvatarUrl,
}: ChatClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasUserSentMessageRef = useRef(false);
  const justLoadedMessagesRef = useRef(false);
  /** When sendMessage creates a new conversation, activeId changes and would trigger loadMessages and wipe optimistic UI — skip that fetch until the send finishes. */
  const skipLoadMessagesOnceForConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    const resize = () => {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    };
    resize();
    ta.addEventListener("input", resize);
    return () => ta.removeEventListener("input", resize);
  }, []);

  const activeConv = conversations.find((c) => c.id === activeId);
  const filteredConvs = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;
  const grouped = groupConversationsByDate(filteredConvs);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        handleNewChat();
      }
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        document.getElementById("chat-search")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNewChat = async () => {
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
      inputRef.current?.focus();
    }
  };

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
    sendMessage(prompt);
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm max-w-md">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-900">
              AI features are not configured. Contact your admin.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0171BB] px-4 py-2 text-sm font-medium text-white hover:bg-[#005a9e]"
            >
              <Settings className="h-4 w-4" />
              Go to settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-[var(--bg-primary)] dark:bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col h-full bg-[var(--bg-card)] dark:bg-[var(--bg-card)] border-r border-[var(--border-color)] transition-all duration-200 ${
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-[260px] shrink-0"
        } ${sidebarOpen ? "fixed inset-y-0 left-0 z-40 w-[260px] lg:relative shadow-lg lg:shadow-none" : "hidden lg:flex"}`}
      >
        <div className="flex flex-col h-full min-w-[260px] min-h-0">
          <div className="p-3 space-y-3 shrink-0">
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 text-white text-sm font-medium py-2.5 rounded-[12px] hover:shadow-[0_0_20px_rgba(0,102,204,0.35)] transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #003B7B 0%, #0066CC 100%)",
              }}
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <input
                id="chat-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-[#f0f2f5] dark:bg-[var(--gray-100)] rounded-[10px] text-sm pl-9 pr-3 py-2 placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] border border-transparent transition"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
            {grouped.map((group) => (
              <div key={group.label} className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold px-3 py-2">
                  {group.label}
                </div>
                {group.conversations.map((conv) => {
                  const preview =
                    conv.title !== "New conversation" ? conv.title : null;
                  const isActive = conv.id === activeId;
                  return (
                    <div
                      key={conv.id}
                      className={`relative group rounded-[12px] cursor-pointer transition-all duration-200 px-3 py-2.5 ${
                        isActive
                          ? "bg-[#eff6ff] dark:bg-[#1e3a5f]/40 border-l-[3px] border-l-[#2563eb] ml-0"
                          : "hover:bg-[#f0f2f5] dark:hover:bg-[var(--card-hover)]"
                      }`}
                      onClick={() => {
                        setActiveId(conv.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {conv.title}
                          </p>
                          {preview && (
                            <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                              {preview}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-secondary)] shrink-0 mt-0.5">
                          {formatRelativeTime(conv.updated_at)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === conv.id ? null : conv.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--gray-200)] transition"
                      >
                        <MoreVertical className="h-4 w-4 text-[var(--text-secondary)]" />
                      </button>
                      {menuOpen === conv.id && (
                        <div
                          className="absolute right-0 top-full mt-1 z-50 w-40 rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-card)] py-1 shadow-lg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTitle(conv.id);
                              setEditTitleValue(conv.title);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--card-hover)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(conv.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 flex-shrink-0 transition"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full min-w-0 min-h-0 overflow-hidden bg-[#eef0f4] dark:bg-[var(--bg-primary)]">
        {/* Header */}
        <header className="shrink-0 flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Menu className="h-5 w-5" />
            </button>
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
                  className="text-base font-bold text-[var(--text-primary)] bg-transparent border-b-2 border-[#2563eb] focus:outline-none min-w-[120px]"
                  autoFocus
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => activeId && setEditingTitle(activeId)}
                    className="text-base font-bold text-[var(--text-primary)] truncate text-left block hover:text-[#2563eb] transition"
                  >
                    {activeConv?.title ?? "New conversation"}
                  </button>
                  <p className="text-xs text-[#9ca3af] mt-[2px]">DECA Engage AI</p>
                </>
              )}
            </div>
          </div>
          <div className="relative shrink-0">
            {activeId && (
              <button
                type="button"
                onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[12px] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--card-hover)] transition"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            )}
            {headerMenuOpen && activeId && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-48 rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-card)] py-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditingTitle(activeId);
                    setEditTitleValue(activeConv?.title ?? "");
                    setHeaderMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--card-hover)]"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleClearMessages}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--card-hover)]"
                >
                  <MessageSquareOff className="h-3.5 w-3.5" />
                  Clear messages
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(activeId)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete conversation
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Messages area */}
        <div
          ref={chatContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 md:px-6 py-4 pb-5 scroll-smooth"
        >
          <div className={`w-full min-h-full ${messages.length === 0 && !loadingMessages ? "max-w-3xl mx-auto flex flex-col items-center justify-center py-16" : ""}`}>
            {loadingMessages ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-pulse text-[var(--text-secondary)] text-sm">Loading...</div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#eff6ff] dark:bg-[#1e3a5f]/50 flex items-center justify-center">
                  <Image
                    src="/deca-engage-logo.png"
                    alt="DECA Engage"
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mt-6">
                  How can I help you today?
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md">
                  I&apos;m your DECA competition coach — ask me about events, strategies, or practice tips
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 max-w-xl">
                  {SUGGESTED_PROMPTS.map(({ text, emoji }) => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => handleSuggestedClick(text)}
                      className="ai-chat-suggestion-chip flex items-center gap-3 rounded-[12px] px-4 py-3.5 text-sm text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#2563eb]/30 transition-all duration-200 text-left"
                    >
                      <span className="text-lg shrink-0">{emoji}</span>
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pb-4 max-w-3xl mx-auto">
                {messages.map((msg, i) => {
                  const prev = messages[i - 1];
                  const marginTop = i === 0 ? 0 : prev?.role === msg.role ? 6 : 16;
                  return (
                  <div
                    key={msg.id}
                    className={`ai-chat-message-enter flex gap-2 items-start ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    style={{ marginTop: marginTop ? `${marginTop}px` : undefined }}
                  >
                    {msg.role === "assistant" && (
                      <div className="shrink-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-[#eff6ff] dark:bg-[#1e3a5f]/50 flex items-center justify-center">
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
                    <div
                      className={`flex flex-col max-w-[65%] ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <>
                          <div className="flex items-start gap-2">
                            <div className="bg-[#2563eb] text-white rounded-[18px] rounded-br-[4px] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap w-fit max-w-full">
                              {msg.content}
                            </div>
                            <Avatar
                              src={userAvatarUrl}
                              name={userDisplayName}
                              size={28}
                              className="shrink-0"
                            />
                          </div>
                          <p className="text-[11px] text-[#9ca3af] text-right mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </>
                      ) : msg.content ? (
                        <>
                          {msg.content.includes("unable to respond") &&
                          msg.content.includes("API credits") ? (
                            <div className="rounded-[18px] rounded-bl-[4px] border border-[#fecaca] dark:border-red-800 bg-[#fef2f2] dark:bg-red-950/30 px-4 py-2.5 text-sm text-red-800 dark:text-red-200">
                              <span className="inline-block mr-1.5">⚠️</span>
                              {msg.content}
                            </div>
                          ) : (
                            <div className="rounded-[18px] rounded-bl-[4px] bg-[#e8ecf1] border border-[#d1d5db] px-4 py-3 text-sm text-[var(--text-primary)] w-fit max-w-full">
                              <div className="prose prose-sm max-w-none text-[var(--text-primary)] dark:prose-invert">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => (
                                      <p className="mb-2 last:mb-0">{children}</p>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-inside mb-2 space-y-1">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-inside mb-2 space-y-1">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="text-sm">{children}</li>
                                    ),
                                    code: ({ className, children }) => {
                                      const isBlock = className?.includes("language-");
                                      if (isBlock) {
                                        return (
                                          <pre className="bg-[var(--gray-900)] text-green-400 rounded-lg p-4 text-xs font-mono overflow-x-auto my-2">
                                            <code>{children}</code>
                                          </pre>
                                        );
                                      }
                                      return (
                                        <code className="bg-[var(--gray-300)] dark:bg-[var(--gray-700)] text-[var(--text-primary)] px-1.5 py-0.5 rounded text-xs font-mono">
                                          {children}
                                        </code>
                                      );
                                    },
                                    strong: ({ children }) => (
                                      <strong className="font-semibold">{children}</strong>
                                    ),
                                    em: ({ children }) => (
                                      <em className="italic">{children}</em>
                                    ),
                                  }}
                                >
                                  {msg.content}
                                </ReactMarkdown>
                              </div>
                            </div>
                          )}
                          <p className="text-[11px] text-[#9ca3af] mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </>
                      ) : isLoading ? (
                        <ThinkingBubble />
                      ) : null}
                    </div>
                    {msg.role === "user" && <div className="w-7 shrink-0" />}
                  </div>
                  );
                })}
                <div ref={bottomRef} className="h-0 shrink-0" aria-hidden />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 flex-shrink-0 bg-[#eef0f4] dark:bg-[var(--bg-primary)] border-t border-[var(--border-color)] px-4 md:px-6 pt-4 pb-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="ai-chat-input-box flex items-end gap-1 bg-[var(--bg-card)] rounded-[24px] pl-4 pr-1 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Ask DECA Engage AI anything..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm min-h-[44px] max-h-[120px] resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--text-secondary)]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`ai-chat-send-btn h-[36px] w-[36px] flex items-center justify-center rounded-full shrink-0 self-end transition-all duration-200 ${
                    !input.trim() || isLoading
                      ? "bg-[var(--gray-200)] dark:bg-[var(--gray-300)] text-[var(--text-secondary)] cursor-not-allowed"
                      : "bg-[#2563eb] text-white cursor-pointer hover:bg-[#1d4ed8]"
                  }`}
                >
                  <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="ai-thinking-bubble">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
  );
}
