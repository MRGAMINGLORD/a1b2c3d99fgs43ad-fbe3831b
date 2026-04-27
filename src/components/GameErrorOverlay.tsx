import { useEffect, useState } from "react";
import { AlertTriangle, X, Copy, Check } from "lucide-react";

interface GameError {
  kind: "runtime" | "console";
  message: string;
  time: number;
}

interface GameErrorMessage {
  __waffleGameError: true;
  kind: "runtime" | "console";
  message: string;
  time: number;
}

const isGameErrorMessage = (data: unknown): data is GameErrorMessage => {
  return (
    !!data &&
    typeof data === "object" &&
    (data as { __waffleGameError?: unknown }).__waffleGameError === true
  );
};

/**
 * Listens for postMessage events from the embedded game iframe (sent by the
 * error forwarders in `reactGameWrapper.ts`) and surfaces them in a dismissible
 * overlay so pasted React/HTML failures aren't hidden inside the iframe.
 */
export const GameErrorOverlay = () => {
  const [errors, setErrors] = useState<GameError[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!isGameErrorMessage(event.data)) return;
      setDismissed(false);
      setErrors((prev) => {
        // De-dup: ignore identical message arriving within 500ms (React tends
        // to fire the same warning twice in dev).
        const last = prev[prev.length - 1];
        if (last && last.message === event.data.message && event.data.time - last.time < 500) {
          return prev;
        }
        return [...prev.slice(-19), {
          kind: event.data.kind,
          message: event.data.message,
          time: event.data.time,
        }];
      });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const clear = () => {
    setErrors([]);
    setDismissed(true);
    setCopied(false);
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(errors.map((e) => `[${e.kind}] ${e.message}`).join("\n\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  if (dismissed || errors.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto w-full max-w-3xl rounded-md border border-destructive bg-background/95 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-2 border-b border-destructive/40 px-3 py-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-display text-xs uppercase tracking-wider">
              Game error{errors.length > 1 ? `s (${errors.length})` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={copyAll}
              className="inline-flex items-center gap-1 rounded border border-primary/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label="Copy errors"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded border border-primary/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
              aria-label="Dismiss errors"
            >
              <X className="h-3 w-3" />
              Dismiss
            </button>
          </div>
        </div>
        <div className="max-h-48 overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-destructive">
          {errors.map((err, idx) => (
            <pre key={idx} className="mb-2 whitespace-pre-wrap break-words last:mb-0">
              <span className="mr-2 rounded bg-destructive/20 px-1 py-0.5 text-[9px] uppercase tracking-wider">
                {err.kind}
              </span>
              {err.message}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
};
