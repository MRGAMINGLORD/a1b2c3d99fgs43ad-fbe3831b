import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Auto-requests fullscreen on the first user gesture. The moment the user
 * leaves fullscreen (Esc, F11, exit-fullscreen button, etc.) we attempt to
 * close the tab. Browsers refuse to close tabs the user opened themselves,
 * so as a fallback we wipe the page to about:blank and tell them to close
 * it manually.
 */
export const FullscreenGate = ({ children }: { children: ReactNode }) => {
  const [terminated, setTerminated] = useState(false);
  const hasEnteredOnceRef = useRef(false);

  // Auto-enter fullscreen on the first user gesture.
  useEffect(() => {
    const tryEnter = async () => {
      if (document.fullscreenElement) return;
      try {
        await document.documentElement.requestFullscreen();
        hasEnteredOnceRef.current = true;
      } catch {
        /* ignored — user can retry by clicking again */
      }
    };
    const handler = () => { void tryEnter(); };
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  // Watch for fullscreen exit → kill the tab.
  useEffect(() => {
    const closeTab = () => {
      // Browsers only honor window.close() for windows opened via script.
      // Try every escape hatch, then fall back to a "tab dead" screen.
      try { window.open("", "_self"); window.close(); } catch { /* ignore */ }
      try { window.close(); } catch { /* ignore */ }
      try { window.location.replace("about:blank"); } catch { /* ignore */ }
      setTerminated(true);
    };
    const onChange = () => {
      if (hasEnteredOnceRef.current && !document.fullscreenElement) {
        closeTab();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

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
          You exited the bunker. Close this tab and open a new one to reconnect.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
