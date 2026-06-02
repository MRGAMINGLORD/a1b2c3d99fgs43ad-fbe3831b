import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  formatPasswordGateLockout,
  getPasswordGateLockoutUntil,
  isPasswordGateLockedOut,
  remainingPasswordGateAttempts,
  submitPasswordGateAttempt,
} from "@/lib/passwordGate";

// Admin login only. New admin accounts are NOT created here — they must be
// provisioned by an existing admin from the backend Users panel. This keeps
// the admin surface from being publicly self-serve.
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(() => getPasswordGateLockoutUntil("admin-login"));
  const navigate = useNavigate();
  const lockedOut = isPasswordGateLockedOut("admin-login");
  const remaining = remainingPasswordGateAttempts("admin-login");

  useEffect(() => {
    if (!lockoutUntil || lockoutUntil <= Date.now()) return;
    const id = window.setInterval(() => setLockoutUntil(getPasswordGateLockoutUntil("admin-login")), 60_000);
    return () => window.clearInterval(id);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedOut) return;
    setLoading(true);
    // Allow co-admin to sign in with the username "67'er" (no email)
    const normalized = email.trim().toLowerCase().replace(/[''`]/g, "'");
    const loginEmail = normalized === "67'er" || normalized === "67er"
      ? "67er@coadmin.local"
      : email;
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) {
      const attempt = submitPasswordGateAttempt("admin-login", false);
      const failed = attempt as Exclude<typeof attempt, { ok: true }>;
      const code = (error as { code?: string }).code;
      setLockoutUntil(failed.lockoutUntil);
      if (code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed")) {
        toast({
          title: "Email not confirmed",
          description: "Click the confirmation link in your inbox, then sign in again.",
          variant: "destructive",
        });
      } else if (failed.lockedOut) {
        toast({
          title: "Login locked",
          description: `Too many failed attempts. Try again in ${formatPasswordGateLockout(failed.lockoutUntil)}.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Login failed", description: `${error.message} ${failed.remaining} attempt${failed.remaining === 1 ? "" : "s"} remaining today.`, variant: "destructive" });
      }
    } else {
      submitPasswordGateAttempt("admin-login", true);
      navigate("/admin");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-8">
        <h1 className="text-center font-display text-2xl text-primary">Admin Login</h1>
        <p className="text-center text-xs text-muted-foreground">
          Admin or co-admin sign-in. Public sign-up is disabled.
        </p>
        {lockedOut && (
          <p className="text-center text-xs text-destructive">
            Too many failed attempts. Try again in {formatPasswordGateLockout(lockoutUntil)}.
          </p>
        )}
        <Input
          type="text"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          disabled={lockedOut || loading}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={lockedOut || loading}
        />
        {!lockedOut && <p className="text-center text-[11px] text-muted-foreground">{remaining} of 3 attempts left today.</p>}
        <Button type="submit" className="w-full" disabled={loading || lockedOut}>
          {loading ? "Please wait..." : "Sign In"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </form>
    </div>
  );
};

export default Login;
