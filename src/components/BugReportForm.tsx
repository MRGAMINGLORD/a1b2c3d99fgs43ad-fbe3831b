// Bug / error report form. Lives next to FeedbackForm. Users pick a game,
// describe the issue, optionally attach a screenshot, and we collect basic
// browser info automatically. Submissions go to `feedback` table (tagged
// `bug:<game>`) via the `submit-bug-report` edge function.

import { useState } from "react";
import { z } from "zod";
import { Bug, ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { GAMES } from "@/lib/games";

const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;

const bugSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  game: z.string().trim().min(1, { message: "Pick the game with the issue" }).max(60),
  title: z.string().trim().min(1, { message: "Title is required" }).max(150),
  description: z
    .string()
    .trim()
    .min(10, { message: "Describe the bug in at least 10 characters" })
    .max(4000),
});

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const BugReportForm = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [game, setGame] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setGame("");
    setTitle("");
    setDescription("");
    setScreenshot(null);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Not an image",
        description: "Please pick a PNG, JPG, or GIF screenshot.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast({
        title: "Image too large",
        description: "Screenshots must be smaller than 3 MB.",
        variant: "destructive",
      });
      return;
    }
    setScreenshot(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bugSchema.safeParse({ name, game, title, description });
    if (!parsed.success) {
      toast({
        title: "Check your report",
        description: parsed.error.issues[0]?.message ?? "Invalid input.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let screenshotDataUrl: string | undefined;
      if (screenshot) {
        screenshotDataUrl = await fileToDataUrl(screenshot);
      }

      const payload = {
        ...parsed.data,
        screenshot: screenshotDataUrl,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        pageUrl: typeof window !== "undefined" ? window.location.href : "",
      };

      const { data, error } = await supabase.functions.invoke("submit-bug-report", {
        body: payload,
      });

      const errMsg =
        (error as { message?: string } | null)?.message ||
        (data as { error?: string } | null)?.error;
      if (errMsg) {
        toast({
          title: "Couldn't send report",
          description: errMsg,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Bug reported",
        description: "Thanks for the heads-up — our wasteland engineers are on it.",
      });
      reset();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <Bug className="h-4 w-4" /> Report a bug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            <Bug className="mb-1 mr-2 inline h-6 w-6" />
            Report an error
          </DialogTitle>
          <DialogDescription>
            Found something broken in one of the games? Tell us what happened and
            attach a screenshot if you have one. Your browser info is included
            automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bug-name">Your name</Label>
              <Input
                id="bug-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bug-game">Which game?</Label>
              <Select value={game} onValueChange={setGame}>
                <SelectTrigger id="bug-game">
                  <SelectValue placeholder="Pick a game" />
                </SelectTrigger>
                <SelectContent>
                  {GAMES.map((g) => (
                    <SelectItem key={g.id} value={g.title}>
                      {g.title}
                    </SelectItem>
                  ))}
                  <SelectItem value="The website">The website (non-game)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-title">Short title</Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Save button does nothing after night 3"
              maxLength={150}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bug-description">What happened?</Label>
            <Textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, what you expected, what actually happened…"
              maxLength={4000}
              rows={5}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Screenshot (optional)</Label>
            {screenshot ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm">
                <ImagePlus className="h-4 w-4 text-primary" />
                <span className="truncate flex-1">{screenshot.name}</span>
                <button
                  type="button"
                  onClick={() => setScreenshot(null)}
                  aria-label="Remove screenshot"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-secondary/20 px-3 py-4 text-sm text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors">
                <ImagePlus className="h-4 w-4" />
                <span>Attach a screenshot (PNG/JPG, ≤ 3 MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Sending…" : "Submit bug report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BugReportForm;
