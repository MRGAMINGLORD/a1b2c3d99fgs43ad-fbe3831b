// Wraps the app and enforces the current DEFCON level on the client.
// - DEFCON 0: stealth — non-admins see a fake "unpublished" placeholder.
// - DEFCON 1: full lockdown except /admin and /login.
// - DEFCON 2: password gate must be cleared (password "WAFFLE", case sensitive).
// - DEFCON 3+: handled per-feature (testing page, feedback form).

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Lock, ShieldAlert, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecretInput } from "@/components/ui/secret-input";
import defcon0Image from "@/assets/defcon0-unpublished.png.asset.json";
import { PasswordGateDecor } from "@/components/PasswordGateDecor";
import {
  useDefcon,
  isDefconGateUnlocked,
  unlockDefconGate,
  isDefconLockedOut,
  getDefconLockoutUntil,
  remainingDefconAttempts,
  DEFCON_LABELS,
} from "@/hooks/useDefcon";

const ADMIN_ALLOWED_PREFIXES = ["/admin", "/login"];

// Heavy bunker blast door, all-yellow accents (the destructive variant just
// uses a darker tone for full lockdown but still stays in the yellow/black palette).
const BlastDoor = ({
  variant = "primary",
  label,
  sublabel,
  icon,
  children,
  doorState = "closed",
}: {
  variant?: "primary" | "warning";
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  doorState?: "closed" | "shake" | "opening";
}) => {
  const stripeColor = "hsl(var(--foreground))";
  const accentClass = "text-foreground";
  const borderClass = variant === "warning" ? "border-foreground" : "border-foreground/70";
  const ringClass = "ring-foreground/30";

  const doorAnim =
    doorState === "shake"
      ? "animate-door-shake"
      : doorState === "opening"
        ? ""
        : "";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Background grid + vignette */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_85%)]" />

      {/* Flash on open */}
      {doorState === "opening" && (
        <div className="pointer-events-none absolute inset-0 bg-foreground/40 animate-flash-clear" />
      )}

      {/* Two-leaf door wrapper */}
      <div className="relative w-full max-w-md" style={{ perspective: "1200px" }}>
        {/* Left leaf */}
        <div
          className={`absolute inset-y-0 left-0 w-1/2 origin-left ${doorState === "opening" ? "animate-door-open-left" : ""} ${doorAnim}`}
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, ${stripeColor} 0 18px, hsl(var(--background)) 18px 36px)`,
            borderRight: "2px solid hsl(var(--foreground))",
            opacity: doorState === "opening" ? 1 : 0,
            transition: "opacity 0.1s",
          }}
        />
        {/* Right leaf */}
        <div
          className={`absolute inset-y-0 right-0 w-1/2 origin-right ${doorState === "opening" ? "animate-door-open-right" : ""}`}
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, ${stripeColor} 0 18px, hsl(var(--background)) 18px 36px)`,
            borderLeft: "2px solid hsl(var(--foreground))",
            opacity: doorState === "opening" ? 1 : 0,
            transition: "opacity 0.1s",
          }}
        />

        {/* Door frame (the panel itself) */}
        <div
          className={`relative rounded-md border-2 ${borderClass} bg-card shadow-2xl ring-8 ${ringClass} ${doorAnim}`}
        >
          {/* Hazard stripe header */}
          <div
            className="h-3 w-full rounded-t-sm"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${stripeColor} 0 14px, hsl(var(--background)) 14px 28px)`,
            }}
          />

          {/* Rivets */}
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-between px-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={`t-${i}`}
                className="h-2.5 w-2.5 rounded-full bg-foreground/80 ring-2 ring-background shadow-inner"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-10 left-2 flex flex-col justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={`l-${i}`} className="h-2.5 w-2.5 rounded-full bg-foreground/70 ring-2 ring-background" />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-10 right-2 flex flex-col justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={`r-${i}`} className="h-2.5 w-2.5 rounded-full bg-foreground/70 ring-2 ring-background" />
            ))}
          </div>

          {/* Inner panel */}
          <div className="m-4 mt-8 rounded-sm border border-foreground/40 bg-background/60 p-6 backdrop-blur">
            {/* Status bar */}
            <div className="mb-5 flex items-center justify-between border-b border-foreground/30 pb-2 font-mono text-[10px] uppercase tracking-widest text-foreground/80">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-foreground" />
                SECURE • SYS-WAFFLE
              </span>
              <span>SECTOR 7-G</span>
            </div>

            {/* Vault wheel / icon */}
            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
              <div className={`absolute inset-0 rounded-full border-4 ${borderClass} animate-border-pulse`} />
              <div
                className={`absolute inset-2 rounded-full border-2 border-dashed border-foreground/50 ${doorState === "opening" ? "animate-vault-spin-fast" : ""}`}
              />
              <div className={`relative ${accentClass}`}>{icon}</div>
            </div>

            <h1 className={`text-center font-display text-3xl uppercase tracking-[0.3em] ${accentClass} text-glow`}>
              {label}
            </h1>
            <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-wider text-foreground/70">
              {sublabel}
            </p>

            <div className="mt-5">{children}</div>
          </div>

          {/* Hazard stripe footer */}
          <div
            className="h-3 w-full rounded-b-sm"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, ${stripeColor} 0 14px, hsl(var(--background)) 14px 28px)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

const formatLockoutCountdown = (until: number): string => {
  const ms = Math.max(0, until - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const DefconGate = ({ children }: { children: React.ReactNode }) => {
  const { level, loading } = useDefcon();
  const { pathname } = useLocation();
  const [pwInput, setPwInput] = useState("");
  const [unlocked, setUnlocked] = useState(isDefconGateUnlocked());
  const [doorState, setDoorState] = useState<"closed" | "shake" | "opening">("closed");
  const [err, setErr] = useState<string | null>(null);
  const [lockoutUntil, setLockoutUntil] = useState<number>(getDefconLockoutUntil());
  const [, setTick] = useState(0);

  // Countdown ticker for lockout display.
  useEffect(() => {
    if (!lockoutUntil || lockoutUntil <= Date.now()) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [lockoutUntil]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground" />
      </div>
    );
  }

  // DEFCON 0 — stealth: site looks unpublished to non-admins
  if (level === 0) {
    const allowed = ADMIN_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1a1a1a]">
          <img
            src={defcon0Image.url}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        </div>
      );
    }
  }

  // DEFCON 1 — full lockdown except admin/login
  if (level === 1) {
    const allowed = ADMIN_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return (
        <BlastDoor
          variant="warning"
          label="DEFCON 1"
          sublabel="Blast door sealed • No entry"
          icon={<ShieldAlert className="h-12 w-12" />}
          doorState="shake"
        >
          <div className="rounded-sm border border-foreground/40 bg-foreground/10 p-3 text-center">
            <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground">
              <AlertTriangle className="h-3 w-3" />
              Lockdown engaged
              <AlertTriangle className="h-3 w-3" />
            </div>
            <p className="mt-2 text-xs text-foreground/70">
              The bunker is sealed by command. All civilian systems offline. Only admin operations are permitted.
            </p>
          </div>
          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-foreground/70">
            ⛔ Access denied — code black
          </div>
        </BlastDoor>
      );
    }
  }

  // DEFCON 2 — password gate (admin/login still bypass so admins can recover)
  if (level === 2 && !unlocked && !ADMIN_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const lockedOut = isDefconLockedOut();
    const remaining = remainingDefconAttempts();

    const handle = (e: React.FormEvent) => {
      e.preventDefault();
      if (lockedOut) return;
      const result = unlockDefconGate(pwInput);
      if (result.ok === true) {
        setErr(null);
        setDoorState("opening");
        window.setTimeout(() => setUnlocked(true), 950);
        return;
      }
      setDoorState("shake");
      window.setTimeout(() => setDoorState("closed"), 500);
      if (result.lockedOut) {
        setLockoutUntil(result.lockoutUntil);
        setErr(`Too many failed attempts. Locked out for 24 hours.`);
      } else {
        setErr(`Incorrect passphrase. ${result.remaining} attempt${result.remaining === 1 ? "" : "s"} remaining.`);
      }
      setPwInput("");
    };

    return (
      <BlastDoor
        variant="primary"
        label="DEFCON 2"
        sublabel={lockedOut ? "Access revoked" : "Authorized personnel only"}
        icon={<Lock className="h-12 w-12" />}
        doorState={doorState}
      >
        {lockedOut ? (
          <div className="rounded-sm border border-foreground/50 bg-foreground/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground">
              <AlertTriangle className="h-3 w-3" />
              Bunker lockout active
              <AlertTriangle className="h-3 w-3" />
            </div>
            <p className="mt-2 text-sm text-foreground/80">
              Three failed attempts. Try again in{" "}
              <span className="font-mono font-bold text-foreground">
                {formatLockoutCountdown(lockoutUntil)}
              </span>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handle}>
            <label
              htmlFor="defcon-passphrase"
              className="mb-1 block cursor-pointer font-mono text-[10px] uppercase tracking-widest text-foreground/80"
            >
              ▸ Enter bunker passphrase
            </label>
            <SecretInput
              id="defcon-passphrase"
              value={pwInput}
              onChange={setPwInput}
              placeholder="••••••••"
              autoFocus
            />
            {err && (
              <p className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-foreground">
                <AlertTriangle className="h-3 w-3" /> {err}
              </p>
            )}
            <Button type="submit" className="mt-4 w-full gap-2 font-display uppercase tracking-widest">
              <KeyRound className="h-4 w-4" />
              Disengage Lock
            </Button>
            <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-widest text-foreground/60">
              {remaining} of 3 attempts remaining • All entries logged
            </p>
          </form>
        )}
      </BlastDoor>
    );
  }

  // Lockout persists across DEFCON level changes — once you're locked out,
  // dropping the level back to 4 doesn't grant access until the timer expires.
  const lockedOutGlobal = isDefconLockedOut();
  if (lockedOutGlobal && !ADMIN_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return (
      <BlastDoor
        variant="warning"
        label="Locked Out"
        sublabel="Bunker access revoked"
        icon={<Lock className="h-12 w-12" />}
        doorState="closed"
      >
        <div className="rounded-sm border border-foreground/50 bg-foreground/10 p-4 text-center">
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-foreground">
            <AlertTriangle className="h-3 w-3" />
            Lockout active
            <AlertTriangle className="h-3 w-3" />
          </div>
          <p className="mt-2 text-sm text-foreground/80">
            Too many failed attempts. Try again in{" "}
            <span className="font-mono font-bold text-foreground">
              {formatLockoutCountdown(lockoutUntil || getDefconLockoutUntil())}
            </span>
            .
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-foreground/60">
            Lockout persists regardless of DEFCON level.
          </p>
        </div>
      </BlastDoor>
    );
  }

  return <>{children}</>;
};

export { DEFCON_LABELS };
