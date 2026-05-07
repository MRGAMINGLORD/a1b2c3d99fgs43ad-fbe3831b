import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { SecretInput } from "@/components/ui/secret-input";
import { toast } from "@/hooks/use-toast";

// Admin login only. New admin accounts are NOT created here — they must be
// provisioned by an existing admin from the backend Users panel. This keeps
// the admin surface from being publicly self-serve.
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Allow co-admin to sign in with the username "67'er" (no email)
    const normalized = email.trim().toLowerCase().replace(/[''`]/g, "'");
    const loginEmail = normalized === "67'er" || normalized === "67er"
      ? "67er@coadmin.local"
      : email;
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed")) {
        toast({
          title: "Email not confirmed",
          description: "Click the confirmation link in your inbox, then sign in again.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      }
    } else {
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
        <SecretInput
          placeholder="Email"
          value={email}
          onChange={setEmail}
        />
        <SecretInput
          placeholder="Password"
          value={password}
          onChange={setPassword}
        />
        <Button type="submit" className="w-full" disabled={loading}>
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
