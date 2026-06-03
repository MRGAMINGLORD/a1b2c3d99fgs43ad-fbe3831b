import { useEffect, useRef, useState } from "react";
import { Terminal, X, Trash2, Copy, Check, ChevronDown } from "lucide-react";

type LogKind = "log" | "info" | "warn" | "error" | "debug" | "runtime";

interface LogLine {
  id: number;
  kind: LogKind;
  message: string;
  time: number;
}

interface IncomingMessage {
  __waffleGameError: true;
  kind: string;
  message: string;
  time: number;
}

const isWaffleMessage = (data: unknown): data is IncomingMessage =>
  !!data &&
  typeof data === "object" &&
  (data as { __waffleGameError?: unknown }).__waffleGameError === true;

// Translate the postMessage `kind` into one of our LogKind buckets.
const mapKind = (raw: string): LogKind => {
  switch (raw) {
    case "console-log":
      return "log";
    case "console-info":
      return "info";
    case "console-warn":
      return "warn";
    case "console-debug":
      return "debug";
    case "runtime":
      return "runtime";
    case "console":
      return "error";
    default:
      return "log";
  }
};

const KIND_STYLES: Record<LogKind, { label: string; cls: string }> = {
  log: { label: "log", cls: "text-foreground/90" },
  info: { label: "info", cls: "text-sky-300" },
  warn: { label: "warn", cls: "text-amber-300" },
  error: { label: "error", cls: "text-destructive" },
  debug: { label: "debug", cls: "text-foreground/60" },
  runtime: { label: "runtime", cls: "text-destructive font-semibold" },
};

interface Props {
  gameTitle?: string;
  gameId?: string;
}

/**
 * Renders a slide-up drawer mirroring `console.*` and runtime errors from the
 * embedded game iframe (forwarded via the script in `reactGameWrapper.ts`).
 * Mounted by `PlayTestGame` next to the back / exit buttons.
 */
export const GameConsolePanel = ({ gameTitle, gameId }: Props) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [unread, setUnread] = useState(0);
  const [copied, setCopied] = useState(false);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoStick = useRef(true);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!isWaffleMessage(event.data)) return;
      const kind = mapKind(event.data.kind);
      setLogs((prev) => {
        idRef.current += 1;
        const next = [
          ...prev.slice(-499),
          { id: idRef.current, kind, message: event.data.message, time: event.data.time },
        ];
        return next;
      });
      setUnread((u) => (open ? 0 : u + 1));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open]);

  // Auto-scroll to bottom unless user scrolled up
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el || !autoStick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, open]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    autoStick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const toggle = () => {
    setOpen((v) => {
      if (!v) setUnread(0);
      return !v;
    });
  };

  const clear = () => {
    setLogs([]);
    setUnread(0);
  };

  const copyAll = async () => {
    try {
      const text = logs
        .map(
          (l) =>
            `[${new Date(l.time).toLocaleTimeString()}] [${KIND_STYLES[l.kind].label}] ${l.message}`,
        )
        .join("\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {/* Toggle button — designed to sit inline with Back / Exit buttons */}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "Hide game console" : "Show game console"}
        title="Toggle game console"
        className="relative flex items-center gap-2 rounded-md border border-primary/60 bg-background/80 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <Terminal className="h-4 w-4" />
        Console
        {logs.length > 0 && (
          <span className="ml-1 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] tracking-normal">
            {logs.length}
          </span>
        )}
        {unread > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[9px] text-destructive-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Slide-up drawer */}
      {open && (
        <div className="absolute inset-x-2 bottom-2 z-40 flex max-h-[50%] flex-col overflow-hidden rounded-md border border-primary/60 bg-background/95 shadow-2xl backdrop-blur sm:inset-x-3 sm:bottom-3">
          <div className="flex items-center justify-between gap-2 border-b border-primary/40 bg-card/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Terminal className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-display text-xs uppercase tracking-wider text-primary">
                Game Console
              </span>
              {(gameTitle || gameId) && (
                <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
                  — {gameTitle ?? "untitled"}
                  {gameId ? ` (${gameId})` : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={copyAll}
                disabled={logs.length === 0}
                className="inline-flex items-center gap-1 rounded border border-primary/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={clear}
                disabled={logs.length === 0}
                className="inline-flex items-center gap-1 rounded border border-primary/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 rounded border border-primary/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                aria-label="Close console"
              >
                <ChevronDown className="h-3 w-3" />
                Hide
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex-1 overflow-auto bg-background/80 px-3 py-2 font-mono text-[11px] leading-relaxed"
          >
            {logs.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No console output yet. Anything the game logs with <span className="text-primary">console.log/info/warn/error</span> will appear here.
              </p>
            ) : (
              logs.map((l) => {
                const meta = KIND_STYLES[l.kind];
                return (
                  <div key={l.id} className="mb-1 flex items-start gap-2 last:mb-0">
                    <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                      {new Date(l.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span
                      className={`shrink-0 rounded bg-card px-1 py-0.5 text-[9px] uppercase tracking-wider ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                    <pre className={`min-w-0 flex-1 whitespace-pre-wrap break-words ${meta.cls}`}>
                      {l.message}
                    </pre>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default GameConsolePanel;
