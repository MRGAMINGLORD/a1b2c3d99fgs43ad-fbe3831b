import { useEffect, useState, type ReactNode } from "react";

/**
 * Auto-requests fullscreen on the first user gesture (click / key / touch),
 * since browsers refuse programmatic fullscreen without one. If the user
 * leaves fullscreen we show a "Connection terminated" screen and try to
 * close the tab.
 */
export const FullscreenGate = ({ children }: { children: ReactNode }) => {
  const [terminated, setTerminated] = useState(false);
  const [hasEnteredOnce, setHasEnteredOnce] = useState(false);

  // Auto-enter fullscreen on the first user gesture.
  useEffect(() => {
    const tryEnter = async () => {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen();
        setHasEnteredOnce(true);
      } catch {
        /* ignored — user can retry */
      }
    };
    const handler = () => { void tryEnter(); };
    window.addEventListener("pointerdown", handler, { once: false });
    window.addEventListener("keydown", handler, { once: false });
    window.addEventListener("touchstart", handler, { once: false });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  // Watch for fullscreen exit → terminate.
  useEffect(() => {
    const onChange = () => {
      if (hasEnteredOnce && !document.fullscreenElement) {
        setTerminated(true);
        try { window.close(); } catch { /* ignore */ }
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [hasEnteredOnce]);

  const reEnter = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setTerminated(false);
    } catch { /* ignore */ }
  };

  if (terminated) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-destructive">
          &gt; Connection terminated
        </div>
        <h1 className="font-display text-3xl uppercase tracking-wider text-primary text-glow">
          Bunker sealed
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          You exited the bunker. Close this tab to disconnect, or re-enter below.
        </p>
        <button
          onClick={reEnter}
          className="rounded-md border border-primary bg-primary px-4 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Re-enter bunker
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
