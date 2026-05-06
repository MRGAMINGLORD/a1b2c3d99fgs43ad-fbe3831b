import { useEffect, useState, type ReactNode } from "react";

/**
 * Wraps the app in a one-tap "Enter Bunker" gate that requests fullscreen
 * (browsers block programmatic fullscreen without a user gesture). Once the
 * user exits fullscreen (Esc or the in-browser exit button), we attempt to
 * close the tab; if the browser blocks `window.close()` (which it does for
 * tabs not opened by a script), we render a terminal "Connection terminated"
 * screen instead.
 */
export const FullscreenGate = ({ children }: { children: ReactNode }) => {
  const [entered, setEntered] = useState(false);
  const [terminated, setTerminated] = useState(false);

  useEffect(() => {
    if (!entered) return;
    const onChange = () => {
      if (!document.fullscreenElement) {
        setTerminated(true);
        // Best-effort tab close; only works for script-opened tabs.
        try { window.close(); } catch { /* ignore */ }
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [entered]);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setEntered(true);
    } catch {
      // If fullscreen is denied (e.g. iframe sandbox), still let them in.
      setEntered(true);
    }
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
          You exited the bunker. Close this tab to disconnect, or reload to re-enter.
        </p>
        <button
          onClick={() => { setTerminated(false); enterFullscreen(); }}
          className="rounded-md border border-primary bg-primary px-4 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Re-enter bunker
        </button>
      </div>
    );
  }

  if (!entered) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative font-mono text-xs uppercase tracking-widest text-muted-foreground">
          &gt; Secure perimeter required
        </div>
        <h1 className="relative font-display text-4xl uppercase tracking-wider text-primary text-glow sm:text-5xl">
          Enter the bunker
        </h1>
        <p className="relative max-w-md text-sm text-muted-foreground">
          For your safety the bunker operates in fullscreen. Pressing Esc or
          exiting fullscreen will sever the connection.
        </p>
        <button
          onClick={enterFullscreen}
          className="relative rounded-md border border-primary bg-primary px-6 py-3 font-display text-base uppercase tracking-wider text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.6)] transition-colors hover:bg-primary/80"
        >
          Seal the door
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
