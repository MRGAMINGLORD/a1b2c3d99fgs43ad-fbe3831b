// Wraps the app and enforces the current DEFCON level on the client.
// - DEFCON 0: only /admin and /login load. Everything else shows a lockdown screen.
// - DEFCON 1: a password gate must be cleared (password "WAFFLE", case sensitive).
// - DEFCON 2+: handled per-feature (testing page, feedback form).

import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDefcon, isDefconGateUnlocked, unlockDefconGate, DEFCON_LABELS } from "@/hooks/useDefcon";

const ADMIN_ALLOWED_PREFIXES = ["/admin", "/login"];

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
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-lg border-2 border-destructive bg-card p-8 text-center">
            <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h1 className="font-display text-3xl uppercase tracking-wider text-destructive">
              DEFCON 0
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              The bunker is in full lockdown. Access has been suspended by command.
              Only admin operations are permitted.
            </p>
          </div>
        </div>
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
        setErr("Incorrect password.");
      }
    };
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <form
          onSubmit={handle}
          className="w-full max-w-sm rounded-lg border-2 border-primary bg-card p-8"
        >
          <Lock className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h1 className="text-center font-display text-2xl uppercase tracking-wider text-primary">
            DEFCON 1
          </h1>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Restricted access. Enter the bunker passphrase to continue.
          </p>
          <Input
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Passphrase"
            className="mt-5"
            autoFocus
          />
          {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
          <Button type="submit" className="mt-4 w-full">
            Unlock
          </Button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
};

export { DEFCON_LABELS };
