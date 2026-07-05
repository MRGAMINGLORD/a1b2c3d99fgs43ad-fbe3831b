import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDefcon } from "@/hooks/useDefcon";


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
  const { level } = useDefcon();
  // DEFCON 0 disguises the site as unpublished — the tab must survive normal
  // refresh/minimize behaviour, so fullscreen enforcement is disabled.
  const disabled = level === 0;

  // Auto-enter fullscreen on the first user gesture.
  useEffect(() => {
    if (disabled) return;

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
  }, [disabled]);

  // Watch for fullscreen exit → kill the tab.
  useEffect(() => {
    if (disabled) return;
    const closeTab = () => {
      // Browsers only honor window.close() for windows opened via script.
      // Try every escape hatch, then fall back to a "tab dead" screen.
      try { window.open("", "_self"); window.close(); } catch { /* ignore */ }
      try { window.close(); } catch { /* ignore */ }
      try { window.location.replace("about:blank"); } catch { /* ignore */ }
      setTerminated(true);
    };
    // Browsers briefly exit fullscreen when native dialogs (confirm, alert,
    // file pickers, permission prompts) appear. We don't want those to nuke
    // the tab, so we wait ~600ms and re-check before terminating. If
    // fullscreen has been re-entered (or is back), we ignore the blip.
    let pending: number | null = null;
    const onChange = () => {
      if (!hasEnteredOnceRef.current) return;
      if (document.fullscreenElement) {
        if (pending !== null) { window.clearTimeout(pending); pending = null; }
        return;
      }
      if (pending !== null) window.clearTimeout(pending);
      pending = window.setTimeout(() => {
        pending = null;
        if (!document.fullscreenElement) closeTab();
      }, 600);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (pending !== null) window.clearTimeout(pending);
    };
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
