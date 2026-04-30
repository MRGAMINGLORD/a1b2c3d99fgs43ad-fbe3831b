import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MessageSquare, Clock } from "lucide-react";
import { useDefcon } from "@/hooks/useDefcon";
import { useEffect } from "react";

const THROTTLE_KEY = "apocalypse-waffle:feedback-last-sent";
const THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

const CATEGORIES = [
  { value: "website", label: "The website" },
  { value: "turtle-trade-co", label: "Turtle Trade Co." },
  { value: "waffle-works", label: "Waffle Works" },
  { value: "waffle-craft", label: "Waffle Craft" },
  { value: "other", label: "Something else" },
];

const feedbackSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  message: z.string().trim().min(1, { message: "Message is required" }).max(1000),
  category: z.string().trim().min(1).max(50),
});

const FeedbackForm = () => {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("website");
  const [loading, setLoading] = useState(false);
  const { level: defcon } = useDefcon();
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (defcon !== 3) {
      setCooldownLeft(0);
      return;
    }
    const tick = () => {
      try {
        const last = parseInt(localStorage.getItem(THROTTLE_KEY) || "0", 10);
        setCooldownLeft(Math.max(0, last + THROTTLE_MS - Date.now()));
      } catch {
        setCooldownLeft(0);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [defcon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (defcon === 3 && cooldownLeft > 0) {
      toast({
        title: "Slow down",
        description: `DEFCON 3: please wait ${Math.ceil(cooldownLeft / 60000)} more minute(s) before sending feedback again.`,
        variant: "destructive",
      });
      return;
    }

    const parsed = feedbackSchema.safeParse({ name, message, category });
    if (!parsed.success) {
      toast({
        title: "Invalid input",
        description: parsed.error.issues[0]?.message ?? "Please check your input.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("submit-feedback", {
      body: parsed.data,
    });
    setLoading(false);

    const errMsg =
      (error as { message?: string } | null)?.message ||
      (data as { error?: string } | null)?.error;

    if (errMsg) {
      toast({
        title: "Couldn't send feedback",
        description: errMsg,
        variant: "destructive",
      });
      return;
    }

    try {
      localStorage.setItem(THROTTLE_KEY, String(Date.now()));
    } catch {}
    if (defcon === 3) setCooldownLeft(THROTTLE_MS);
    toast({ title: "Thanks!", description: "Your feedback has been submitted." });
    setName("");
    setMessage("");
    setCategory("website");
  };

  return (
    <section className="mx-auto max-w-md px-6 pb-20 pt-4">
      <h2 className="mb-6 text-center font-display text-3xl text-primary sm:text-4xl">
        <MessageSquare className="mx-auto mb-2 h-8 w-8" />
        Send Feedback
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="feedback-category">What's this about?</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="feedback-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />
        <Textarea
          placeholder="Your feedback..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Submit Feedback"}
        </Button>
      </form>
    </section>
  );
};

export default FeedbackForm;
