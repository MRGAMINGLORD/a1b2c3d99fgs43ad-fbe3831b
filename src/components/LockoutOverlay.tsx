import { useEffect, useRef, useState } from "react";
import { Lock, AlertTriangle, Skull } from "lucide-react";
import {
  PASSWORD_GATE_LOCKED_OUT_EVENT,
  type PasswordGateLockedOutDetail,
  formatPasswordGateLockout,
} from "@/lib/passwordGate";

/**
 * Full-screen lockout cinematic. Mounts globally and listens for the
 * `PASSWORD_GATE_LOCKED_OUT_EVENT` dispatched from `passwordGate.ts` whenever
 * any gate (admin, tester, editor, DEFCON) hits its 3-strike threshold.
 *
 * Plays a ~3s animation: red flash, two steel slabs slamming shut, a giant
 * "ACCESS REVOKED" stamp, a padlock dropping in, and an animated scanline.
 * Auto-dismisses; user can also click to skip.
 */
export const LockoutOverlay = () => {
  const [active, setActive] = useState<PasswordGateLockedOutDetail | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PasswordGateLockedOutDetail>).detail;
      if (!detail) return;
      setActive(detail);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setActive(null), 3200);
    };
    window.addEventListener(PASSWORD_GATE_LOCKED_OUT_EVENT, handler);
    return () => {
      window.removeEventListener(PASSWORD_GATE_LOCKED_OUT_EVENT, handler);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!active) return null;

  const skip = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setActive(null);
  };

  // Stripe pattern reused on each slab to feel like a bunker blast door.
  const slabStripes =
    "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0 22px, hsl(var(--background)) 22px 44px)";

  return (
    <div
      role="alertdialog"
      aria-label={`Locked out of ${active.label}`}
      onClick={skip}
      className="fixed inset-0 z-[10000] cursor-pointer overflow-hidden animate-lockout-fadeout"
    >
      {/* Red alarm flash */}
      <div className="pointer-events-none absolute inset-0 bg-destructive animate-lockout-flash" />

      {/* Two slamming slabs */}
      <div
        className="absolute inset-y-0 left-0 w-1/2 animate-lockout-slam-left shadow-[8px_0_30px_-2px_rgba(0,0,0,0.8)]"
        style={{ backgroundImage: slabStripes, borderRight: "3px solid hsl(var(--foreground))" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/2 animate-lockout-slam-right shadow-[-8px_0_30px_-2px_rgba(0,0,0,0.8)]"
        style={{ backgroundImage: slabStripes, borderLeft: "3px solid hsl(var(--foreground))" }}
      />

      {/* Backdrop after slabs join */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" style={{ animation: "lockout-flash 0.6s ease-out 0.6s forwards" }} />

      {/* Scanline */}
      <div className="pointer-events-none absolute inset-x-0 h-px bg-foreground/50 shadow-[0_0_24px_4px_hsl(var(--foreground)/0.6)] animate-lockout-scan" />

      {/* Content (shakes on impact) */}
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-4 px-4 text-center animate-lockout-shake">
        {/* Dropping padlock */}
        <div className="animate-lockout-padlock">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-foreground bg-background/60 shadow-[0_0_40px_hsl(var(--foreground)/0.8)]">
            <Lock className="h-12 w-12 text-foreground" strokeWidth={2.5} />
          </div>
        </div>

        {/* Giant stamp */}
        <div className="animate-lockout-stamp opacity-0">
          <div className="border-[6px] border-foreground bg-background/40 px-6 py-3 shadow-[0_0_40px_hsl(var(--foreground)/0.5)]">
            <p className="font-display text-4xl uppercase tracking-[0.25em] text-foreground text-glow sm:text-6xl">
              Access Revoked
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/80 sm:text-xs">
              ▸ {active.label} ◂
            </p>
          </div>
        </div>

        {/* Sub copy */}
        <div className="mt-2 flex items-center gap-2 rounded border border-foreground/50 bg-background/70 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-foreground sm:text-xs">
          <AlertTriangle className="h-4 w-4" />
          <span>3 strikes — lockout: {formatPasswordGateLockout(active.lockoutUntil)}</span>
          <Skull className="h-4 w-4" />
        </div>

        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.3em] text-foreground/50">
          click anywhere to dismiss
        </p>
      </div>
    </div>
  );
};

export default LockoutOverlay;
