// Wraps the app and enforces the current DEFCON level on the client.
// - DEFCON 0: only /admin and /login load. Everything else shows a lockdown screen.
// - DEFCON 1: a password gate must be cleared (password "WAFFLE", case sensitive).
// - DEFCON 2+: handled per-feature (testing page, feedback form).

import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Lock, ShieldAlert, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecretInput } from "@/components/ui/secret-input";
import { useDefcon, isDefconGateUnlocked, unlockDefconGate, DEFCON_LABELS } from "@/hooks/useDefcon";

const ADMIN_ALLOWED_PREFIXES = ["/admin", "/login"];

// Shared chrome that frames a lock screen as a heavy bunker blast door.
const BlastDoor = ({
  accent,
  label,
  sublabel,
  icon,
  children,
}: {
  accent: "destructive" | "primary";
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => {
  const accentClass = accent === "destructive" ? "text-destructive" : "text-primary";
  const borderClass = accent === "destructive" ? "border-destructive/70" : "border-primary/70";
  const ringClass = accent === "destructive" ? "ring-destructive/30" : "ring-primary/30";
  const stripeColor =
    accent === "destructive" ? "hsl(var(--destructive))" : "hsl(var(--primary))";

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

      {/* Door frame */}
      <div className={`relative w-full max-w-md rounded-md border-2 ${borderClass} bg-card shadow-2xl ring-8 ${ringClass}`}>
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
              className={`h-2.5 w-2.5 rounded-full bg-muted ring-2 ring-background ${accentClass} shadow-inner`}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-10 left-2 flex flex-col justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={`l-${i}`} className="h-2.5 w-2.5 rounded-full bg-muted ring-2 ring-background" />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-10 right-2 flex flex-col justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={`r-${i}`} className="h-2.5 w-2.5 rounded-full bg-muted ring-2 ring-background" />
          ))}
        </div>

        {/* Inner panel */}
        <div className="m-4 mt-8 rounded-sm border border-border/70 bg-background/60 p-6 backdrop-blur">
          {/* Status bar */}
          <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 animate-pulse rounded-full ${accent === "destructive" ? "bg-destructive" : "bg-primary"}`} />
              SECURE • SYS-WAFFLE
            </span>
            <span>SECTOR 7-G</span>
          </div>

          {/* Vault wheel / icon */}
          <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
            <div className={`absolute inset-0 rounded-full border-4 ${borderClass} animate-border-pulse`} />
            <div className="absolute inset-2 rounded-full border-2 border-dashed border-muted-foreground/40" />
            <div className={`relative ${accentClass}`}>{icon}</div>
          </div>

          <h1 className={`text-center font-display text-3xl uppercase tracking-[0.3em] ${accentClass} text-glow`}>
            {label}
          </h1>
          <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
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
  );
};

export const DefconGate = ({ children }: { children: React.ReactNode }) => {
  const { level, loading } = useDefcon();
  const { pathname } = useLocation();
  const [pwInput, setPwInput] = useState("");
  const [unlocked, setUnlocked] = useState(isDefconGateUnlocked());
  const [err, setErr] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // DEFCON 0 — full lockdown except admin/login
  if (level === 0) {
    const allowed = ADMIN_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
    if (!allowed) {
      return (
        <BlastDoor
          accent="destructive"
          label="DEFCON 0"
          sublabel="Blast door sealed • No entry"
          icon={<ShieldAlert className="h-12 w-12" />}
        >
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-center">
            <div className="flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Lockdown engaged
              <AlertTriangle className="h-3 w-3" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The bunker is sealed by command. All civilian systems offline. Only admin operations are permitted.
            </p>
          </div>
          <div className="mt-3 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            ⛔ Access denied — code black
          </div>
        </BlastDoor>
      );
    }
  }

  // DEFCON 1 — password gate (admin/login still bypass so admins can recover)
  if (level === 1 && !unlocked && !ADMIN_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const handle = (e: React.FormEvent) => {
      e.preventDefault();
      if (unlockDefconGate(pwInput)) {
        setUnlocked(true);
        setErr(null);
      } else {
        setErr("Incorrect passphrase. Attempt logged.");
      }
    };
    return (
      <BlastDoor
        accent="primary"
        label="DEFCON 1"
        sublabel="Authorized personnel only"
        icon={<Lock className="h-12 w-12" />}
      >
        <form onSubmit={handle}>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            ▸ Enter bunker passphrase
          </label>
          <SecretInput
            value={pwInput}
            onChange={setPwInput}
            placeholder="••••••••"
            autoFocus
          />
          {err && (
            <p className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-destructive">
              <AlertTriangle className="h-3 w-3" /> {err}
            </p>
          )}
          <Button type="submit" className="mt-4 w-full gap-2 font-display uppercase tracking-widest">
            <KeyRound className="h-4 w-4" />
            Disengage Lock
          </Button>
          <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            All entry attempts are recorded
          </p>
        </form>
      </BlastDoor>
    );
  }

  return <>{children}</>;
};

export { DEFCON_LABELS };
