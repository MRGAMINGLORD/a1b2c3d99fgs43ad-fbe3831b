// Floating concierge button + side-sheet chat with Sir Wafflington the 67th.
// Mounts once at app root so he greets visitors on every route.

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { SirWafflingtonAvatar } from "./SirWafflingtonAvatar";
import { useSirWafflington, type ChatMsg } from "./SirWafflingtonContext";
import { useWafflingtonUnlocked } from "@/lib/wafflingtonUnlock";
import { areGamesUnlocked, unlockGames } from "@/lib/gamesUnlock";

const PASSWORD = "67 IS GREAT"; // case-sensitive
const DENY_LINES = [
  "*Sir Wafflington raises a powdered eyebrow.* I haven't the foggiest notion what 'keys' you speak of, dear visitor. Perhaps you'd be happier on one of those *other* gaming sites — they have such delightful pop-ups, I hear.",
  "*sighs theatrically* Still on about keys? There are no keys. Truly, you'd save yourself such heartache by simply closing this tab and visiting Coolmath, or whatever the children play these days.",
  "I shall say it once more, in the plainest English: there. are. no. keys. Run along, find another wasteland. This one is, regrettably, all out of games for you.",
];
const GRANT_LINE =
  "*A long pause. Sir Wafflington dabs his monocle with a silk handkerchief.* …Very well. You have proven *unreasonably* persistent, and I do so admire that in a visitor. Consider the Games unlocked. Close this chat and they shall appear, as if by magic — because, in a sense, they did.";

const STARTER_PROMPTS = [
  "What games are available?",
  "How do I save my progress?",
  "Tell me about Defense of Belgium.",
];

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sir-wafflington`;

export const SirWafflingtonChat = ({ hidden = false }: { hidden?: boolean }) => {
  const { open, setOpen, input, setInput, messages, setMessages, streaming, setStreaming } =
    useSirWafflington();
  const unlocked = useWafflingtonUnlocked();
  // Treat as hidden whenever the route hides him OR he hasn't been summoned yet
  // via the secret phrase in the feedback form.
  const effectiveHidden = hidden || !unlocked;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const passwordAttempts = useRef(0);
  const pendingUnlock = useRef(false);


  // Auto-scroll to bottom on new tokens
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

    // Secret games-unlock flow: case-sensitive match on the password phrase.
    if (!areGamesUnlocked() && text.includes(PASSWORD)) {
      const userMsg: ChatMsg = { role: "user", content: text };
      setInput("");
      const attempt = passwordAttempts.current + 1;
      passwordAttempts.current = attempt;
      let reply: string;
      if (attempt >= 4) {
        reply = GRANT_LINE;
        pendingUnlock.current = true;
      } else {
        reply = DENY_LINES[Math.min(attempt - 1, DENY_LINES.length - 1)];
      }
      setMessages((prev) => [
        ...prev,
        userMsg,
        { role: "assistant", content: reply },
      ]);
      return;
    }



    const userMsg: ChatMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
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
        let msg = "Sir Wafflington is momentarily indisposed.";
        try {
          const j = await resp.json();
          if (j?.error) msg = j.error;
        } catch {}
        if (resp.status === 429) {
          toast({ title: "Slow down, dear visitor", description: msg });
        } else if (resp.status === 402) {
          toast({
            title: "Concierge unavailable",
            description: msg,
            variant: "destructive",
          });
        } else {
          toast({ title: "Concierge error", description: msg, variant: "destructive" });
        }
        // Roll back the user message so they can retry
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
            if (content) upsertAssistant(content);
          } catch {
            // Partial JSON — restore and wait for more
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Final flush
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
            if (content) upsertAssistant(content);
          } catch {}
        }
      }
    } catch (err) {
      console.error("Sir Wafflington chat error:", err);
      toast({
        title: "Connection lost",
        description: "Sir Wafflington could not be reached. Please try again.",
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
    <Sheet open={open && unlocked} onOpenChange={(o) => unlocked && setOpen(o)}>
      <SheetTrigger asChild>
        <button
          aria-label="Ask Sir Wafflington the 67th"
          aria-hidden={effectiveHidden}
          tabIndex={effectiveHidden ? -1 : 0}
          className={cn(
            "group fixed bottom-5 right-5 z-50 flex items-center gap-2",
            "rounded-full border-2 border-primary bg-card pl-1.5 pr-4 py-1.5",
            "shadow-[0_0_24px_hsl(48_100%_50%/0.35)] hover:shadow-[0_0_36px_hsl(48_100%_50%/0.55)]",
            "transition-all duration-500 hover:scale-105",
            effectiveHidden
              ? "opacity-0 translate-y-4 pointer-events-none"
              : "opacity-100 translate-y-0",
          )}
        >
          <span className="block rounded-full bg-background/40 p-0.5">
            <SirWafflingtonAvatar size={44} />
          </span>
          <span className="hidden sm:inline-block font-display text-sm uppercase tracking-wider text-primary">
            Ask Sir Wafflington
          </span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0 gap-0 border-l-2 border-primary/40"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b-2 border-primary/30 bg-card px-4 py-3">
          <SirWafflingtonAvatar size={56} />
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-lg uppercase tracking-wider text-primary leading-tight">
              Sir Wafflington <span className="text-accent">the 67th</span>
            </h2>
            <p className="text-xs text-muted-foreground italic">
              Hub Concierge & Connoisseur of Fine Diversions
            </p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-card/60 p-3 text-sm">
                <p className="leading-relaxed">
                  <span className="font-display text-primary">Greetings, dear visitor!</span>{" "}
                  I am <strong>Sir Wafflington the 67th</strong>, humble concierge of
                  this most distinguished gaming establishment. Pray, how may I be of
                  service this fine afternoon in the wasteland?
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Try asking
                </p>
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="block w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-sm hover:border-primary/60 hover:bg-secondary transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <MessageBubble key={i} msg={m} />
              ))}
              {streaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-start gap-2">
                  <SirWafflingtonAvatar size={32} className="shrink-0 mt-1" />
                  <div className="rounded-lg bg-secondary/60 px-3 py-2 text-sm italic text-muted-foreground">
                    <span className="inline-flex gap-1">
                      <span className="animate-bounce">·</span>
                      <span className="animate-bounce [animation-delay:0.15s]">·</span>
                      <span className="animate-bounce [animation-delay:0.3s]">·</span>
                    </span>{" "}
                    composing a most refined reply
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t-2 border-primary/30 bg-card p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a game, controls, or how to save…"
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
          {(messages.length > 0 || input.length > 0) && (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={streaming}
              className="mt-2 text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Clear conversation
            </button>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Sir Wafflington shall forget every word exchanged, including your
              current draft. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setMessages([]);
                setInput("");
                setConfirmClear(false);
              }}
            >
              Yes, clear it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};

const MessageBubble = ({ msg }: { msg: ChatMsg }) => {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <SirWafflingtonAvatar size={32} className="shrink-0 mt-1" />
      <div className="max-w-[85%] rounded-lg bg-secondary/60 px-3 py-2 text-sm prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_strong]:text-primary">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    </div>
  );
};
