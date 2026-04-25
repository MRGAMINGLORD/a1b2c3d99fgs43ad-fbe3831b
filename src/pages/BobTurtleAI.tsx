// Bob the Turtle — full-page educational chat tutor.
// Streams responses from the bob-turtle edge function (Lovable AI / Gemini).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import bobCover from "@/assets/cover-bob-turtle-ai.jpg";

type ChatMsg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Explain photosynthesis like I'm 12.",
  "Help me solve: 3x + 7 = 22",
  "What caused World War I?",
  "Teach me a quick Python loop.",
];

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bob-turtle`;

const BobTurtleAI = () => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewport = el.querySelector(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages, streaming]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;

    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    let soFar = "";
    const upsert = (chunk: string) => {
      soFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: soFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: soFar }];
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
        let msg = "Bob is hiding in his shell.";
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch {}
        toast({
          title: resp.status === 429 ? "Slow down" : "Bob is unavailable",
          description: msg,
          variant: resp.status === 402 ? "destructive" : "default",
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

      if (buffer.trim()) {
        for (let raw of buffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const json = raw.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const content: string | undefined =
              parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {}
        }
      }
    } catch (err) {
      console.error("Bob chat error:", err);
      toast({
        title: "Connection lost",
        description: "Bob couldn't be reached. Please try again.",
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-primary/30 bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-background/60 px-3 py-1.5 font-display text-xs uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to hub
          </Link>
          <div className="flex items-center gap-3">
            <img
              src={bobCover}
              alt="Bob the Turtle, scholarly tutor"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border-2 border-primary object-cover"
            />
            <div>
              <h1 className="font-display text-2xl uppercase tracking-wider text-primary leading-none">
                Bob the Turtle
              </h1>
              <p className="text-xs italic text-muted-foreground">
                Patient tutor · powered by Gemini
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex h-[calc(100vh-73px)] max-w-4xl flex-col px-4">
        <ScrollArea ref={scrollRef} className="flex-1 py-6">
          {messages.length === 0 ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-primary/30 bg-card/60 p-5">
                <p className="leading-relaxed">
                  <span className="font-display text-primary">Well, hello there!</span>{" "}
                  I'm <strong>Bob</strong>. Slow and steady wins the race — and
                  understanding. Ask me about <em>any subject</em>: math,
                  science, history, languages, code, study tricks. We'll take it
                  one shell-sized step at a time. 🐢
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                  Try asking
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STARTERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-sm hover:border-primary/60 hover:bg-secondary transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <Bubble key={i} msg={m} />
              ))}
              {streaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-start gap-2">
                  <img
                    src={bobCover}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-full border border-primary/60 object-cover mt-1"
                  />
                  <div className="rounded-lg bg-secondary/60 px-3 py-2 text-sm italic text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">·</span>
                      <span className="animate-bounce [animation-delay:0.15s]">·</span>
                      <span className="animate-bounce [animation-delay:0.3s]">·</span>
                    </span>{" "}
                    Bob is thinking
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t-2 border-primary/30 bg-card/60 p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Bob anything you want to learn…"
              disabled={streaming}
              rows={2}
              className="min-h-[44px] resize-none text-sm"
            />
            <Button
              size="icon"
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              disabled={streaming}
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <X className="h-3 w-3" /> Clear conversation
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

const Bubble = ({ msg }: { msg: ChatMsg }) => {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <img
        src={bobCover}
        alt="Bob the Turtle"
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full border border-primary/60 object-cover mt-1"
      />
      <div className="prose prose-sm prose-invert max-w-[85%] rounded-lg bg-secondary/60 px-3 py-2 text-sm [&_strong]:text-primary [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_code]:text-primary">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    </div>
  );
};

export default BobTurtleAI;
