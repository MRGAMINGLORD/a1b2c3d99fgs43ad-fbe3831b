import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecretInput } from "@/components/ui/secret-input";
import { toast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setLoading(false);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "A confirmation link has been sent to your email." });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        // Surface the specific reason so admins know exactly what's wrong.
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
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-8">
        <h1 className="text-center font-display text-2xl text-primary">
          {isSignUp ? "Create Account" : "Admin Login"}
        </h1>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <SecretInput
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={setPassword}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
        </Button>
        <Button
          type="button"
          variant="link"
          className="w-full"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </form>
    </div>
  );
};

export default Login;
