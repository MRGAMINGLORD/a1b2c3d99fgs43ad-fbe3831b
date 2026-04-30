// Bob the Turtle — educational AI tutor page.
// Streams answers from the `bob-turtle` edge function via SSE.
// Supports multiple chat sessions and 3 Gemini modes (fast / thinking / pro).

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Send,
  Trash2,
  Loader2,
  BookOpen,
  Plus,
  MessageSquarePlus,
  Eraser,
  Zap,
  Brain,
  Sparkles,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string };
type Mode = "fast" | "thinking" | "pro";

type ChatSession = {
  id: string;
  title: string;
  mode: Mode;
  messages: ChatMsg[];
  createdAt: number;
};

const STORAGE_KEY = "apocalypse-waffle:bob-turtle-sessions-v2";
const ACTIVE_KEY = "apocalypse-waffle:bob-turtle-active";
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-turtle`;

const STARTERS = [
  "Explain the Pythagorean theorem like I'm 12.",
  "Help me outline a 5-paragraph essay on climate change.",
  "Walk me through how photosynthesis works.",
  "What's the difference between mitosis and meiosis?",
];

const MODE_INFO: Record<Mode, { label: string; desc: string; icon: typeof Zap }> = {
  fast: { label: "Fast", desc: "Quick answers (Gemini Flash Lite)", icon: Zap },
  thinking: { label: "Thinking", desc: "Balanced reasoning (Gemini Flash)", icon: Brain },
  pro: { label: "Pro", desc: "Deepest answers (Gemini Pro)", icon: Sparkles },
};

const newSession = (mode: Mode = "thinking"): ChatSession => ({
  id: crypto.randomUUID(),
  title: "New chat",
  mode,
  messages: [],
  createdAt: Date.now(),
});

const loadSessions = (): { sessions: ChatSession[]; activeId: string } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const activeRaw = localStorage.getItem(ACTIVE_KEY);
      const activeId =
        activeRaw && parsed.some((s: ChatSession) => s.id === activeRaw)
          ? activeRaw
          : parsed[0].id;
      return { sessions: parsed as ChatSession[], activeId };
    }
  } catch {}
  const s = newSession();
  return { sessions: [s], activeId: s.id };
};

const BobTurtleAI = () => {
  const initial = useMemo(loadSessions, []);
  const [sessions, setSessions] = useState<ChatSession[]>(initial.sessions);
  const [activeId, setActiveId] = useState<string>(initial.activeId);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeId) ?? sessions[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {}
  }, [activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewport = el.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [active?.messages, streaming]);

  const updateActive = (updater: (s: ChatSession) => ChatSession) => {
    setSessions((prev) => prev.map((s) => (s.id === activeId ? updater(s) : s)));
  };

  const setMessages = (next: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => {
    updateActive((s) => ({
      ...s,
      messages: typeof next === "function" ? (next as (p: ChatMsg[]) => ChatMsg[])(s.messages) : next,
    }));
  };

  const setMode = (mode: Mode) => updateActive((s) => ({ ...s, mode }));

  const createChat = () => {
    const s = newSession(active?.mode ?? "thinking");
    setSessions((prev) => [s, ...prev]);
    setActiveId(s.id);
  };

  const deleteChat = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (next.length === 0) {
        const fresh = newSession();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const clearActive = () => {
    updateActive((s) => ({ ...s, messages: [], title: "New chat" }));
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming || !active) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...active.messages, userMsg];
    setMessages(next);
    // Set the chat title from the first user message
    if (active.messages.length === 0) {
      updateActive((s) => ({
        ...s,
        title: text.slice(0, 40) + (text.length > 40 ? "…" : ""),
        messages: next,
      }));
    }
    setInput("");
    setStreaming(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, mode: active.mode }),
      });

      if (!resp.ok) {
        let msg = "Bob is taking a nap. Try again shortly.";
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch {}
        toast({
          title: resp.status === 429 ? "Slow down a bit" : "Bob can't answer",
          description: msg,
          variant: resp.status === 402 ? "destructive" : undefined,
        });
        setMessages((prev) => prev.filter((m) => m !== userMsg));
        setStreaming(false);
        return;
      }

      if (!resp.body) {
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const content: string | undefined =
              parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error("Bob the Turtle error:", err);
      toast({
        title: "Connection lost",
        description: "Could not reach Bob. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => prev.filter((m) => m !== userMsg));
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const Sidebar = (
    <div className="flex h-full flex-col gap-2 p-3">
      <Button onClick={createChat} className="w-full gap-2">
        <Plus className="h-4 w-4" /> New chat
      </Button>
      <div className="mt-1 flex-1 overflow-y-auto pr-1">
        <div className="space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition",
                s.id === activeId
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-card/40 text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              <button
                onClick={() => setActiveId(s.id)}
                className="flex-1 truncate text-left"
                title={s.title}
              >
                {s.title || "New chat"}
              </button>
              <button
                onClick={() => deleteChat(s.id)}
                className="opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                aria-label="Delete chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-primary/40 bg-card/40 md:block">
        {Sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="border-b border-primary/40 bg-card/60 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  {Sidebar}
                </SheetContent>
              </Sheet>
              <Button asChild variant="ghost" size="icon" className="shrink-0">
                <Link to="/" aria-label="Back to hub">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-2xl">
                🐢
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg uppercase tracking-wider text-primary sm:text-xl">
                  Bob the Turtle
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  Patient AI tutor for any subject
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={active?.mode ?? "thinking"}
                onValueChange={(v) => setMode(v as Mode)}
                disabled={streaming}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_INFO) as Mode[]).map((m) => {
                    const Icon = MODE_INFO[m].icon;
                    return (
                      <SelectItem key={m} value={m}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{MODE_INFO[m].label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {(active?.messages.length ?? 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearActive}
                  className="gap-1"
                  title="Clear this chat's history"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={createChat}
                className="gap-1"
                title="New chat"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Chat area */}
        <main className="flex flex-1 flex-col">
          <ScrollArea ref={scrollRef} className="flex-1">
            <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
              {!active || active.messages.length === 0 ? (
                <div className="space-y-6 py-8 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary bg-primary/10 text-5xl">
                    🐢
                  </div>
                  <div>
                    <h2 className="font-display text-2xl uppercase tracking-wider text-primary">
                      Slow and steady learning
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      Ask me anything — math, science, history, writing, code.
                      I'll break it down shell-sized.
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
                      Mode: <span className="text-primary">{MODE_INFO[active?.mode ?? "thinking"].label}</span>
                      {" — "}
                      {MODE_INFO[active?.mode ?? "thinking"].desc}
                    </p>
                  </div>
                  <div className="mx-auto grid max-w-2xl gap-2 sm:grid-cols-2">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-lg border border-primary/30 bg-card/40 px-4 py-3 text-left text-sm text-foreground/80 transition hover:border-primary hover:bg-primary/10 hover:text-foreground"
                      >
                        <BookOpen className="mb-1 inline h-3.5 w-3.5 text-primary" />{" "}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {active.messages.map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3",
                        m.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      {m.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/10 text-base">
                          🐢
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-primary/30 bg-card/60 text-foreground",
                        )}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm prose-invert max-w-none prose-headings:text-primary prose-a:text-primary prose-code:text-primary">
                            <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {streaming &&
                    active.messages[active.messages.length - 1]?.role === "user" && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/10 text-base">
                          🐢
                        </div>
                        <div className="rounded-lg border border-primary/30 bg-card/60 px-4 py-2.5">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="border-t border-primary/40 bg-card/60 px-4 py-3 sm:px-6">
            <div className="mx-auto flex max-w-4xl gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Bob anything…"
                rows={1}
                className="min-h-[44px] resize-none"
                disabled={streaming}
              />
              <Button
                onClick={() => send()}
                disabled={!input.trim() || streaming}
                size="icon"
                className="h-11 w-11 shrink-0"
                aria-label="Send"
              >
                {streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BobTurtleAI;
