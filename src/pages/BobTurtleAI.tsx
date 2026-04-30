// Bob the Turtle — educational AI tutor page.
// Streams answers from the `bob-turtle` edge function via SSE.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Send, Trash2, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ChatMsg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "apocalypse-waffle:bob-turtle-history";
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-turtle`;

const STARTERS = [
  "Explain the Pythagorean theorem like I'm 12.",
  "Help me outline a 5-paragraph essay on climate change.",
  "Walk me through how photosynthesis works.",
  "What's the difference between mitosis and meiosis?",
];

const loadHistory = (): ChatMsg[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const BobTurtleAI = () => {
  const [messages, setMessages] = useState<ChatMsg[]>(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewport = el.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages, streaming]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
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
        body: JSON.stringify({ messages: next }),
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

  const clearHistory = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-primary/40 bg-card/60 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
      </header>

      {/* Chat area */}
      <main className="flex flex-1 flex-col">
        <ScrollArea ref={scrollRef} className="flex-1">
          <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
            {messages.length === 0 ? (
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
                {messages.map((m, i) => (
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
                {streaming && messages[messages.length - 1]?.role === "user" && (
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
  );
};

export default BobTurtleAI;
