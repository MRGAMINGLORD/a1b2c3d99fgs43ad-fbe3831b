import { useEffect, useState } from "react";
import { Copy, Check, FileDown, Github, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { CustomGameRow } from "@/hooks/useCustomGames";

interface Props {
  game: CustomGameRow | null;
  onClose: () => void;
}

const isStoredFileUrl = (s: string) =>
  /^https?:\/\//i.test(s.trim()) && s.includes(`/game-files/`);

/**
 * Helper dialog that gives admins everything they need to commit a custom
 * game's HTML into the project repo at `public/games/<slug>/index.html`,
 * which makes the file visible in GitHub (matching Turtle Trade Co etc.).
 *
 * The browser/runtime can't write into the repo itself, so this dialog:
 *   1. Resolves the final HTML (fetches from Storage if needed).
 *   2. Shows the target path + a copy button.
 *   3. Provides a ready-to-paste instruction for Lovable chat that will
 *      create the file on the next message.
 */
const ExportToRepoDialog = ({ game, onClose }: Props) => {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"html" | "prompt" | null>(null);

  useEffect(() => {
    if (!game) {
      setHtml("");
      return;
    }
    setLoading(true);
    setCopied(null);
    (async () => {
      try {
        if (isStoredFileUrl(game.html)) {
          const res = await fetch(game.html);
          setHtml(await res.text());
        } else {
          setHtml(game.html);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({
          title: "Could not load game source",
          description: msg,
          variant: "destructive",
        });
        setHtml("");
      } finally {
        setLoading(false);
      }
    })();
  }, [game]);

  if (!game) return null;

  const targetPath = `public/games/${game.slug}/index.html`;
  const promptText = `Create the file ${targetPath} in the repo with the exact HTML I'll paste next, so the game is committed to GitHub like the other built-in games. After the file exists, no other code changes are needed — PlayGame.tsx already prefers the repo copy when present.`;

  const copy = async (text: string, which: "html" | "prompt") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Select and copy manually.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={!!game} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-wider text-primary">
            <Github className="h-5 w-5" />
            Export "{game.title}" to repo
          </DialogTitle>
          <DialogDescription>
            Commit this game as a real file so it appears in GitHub alongside Turtle Trade Co. The
            in-Storage copy stays as a fallback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-primary/40 bg-background/40 p-3">
            <div className="mb-1 font-display text-xs uppercase tracking-wider text-primary">
              Step 1 — Target path
            </div>
            <div className="flex items-center justify-between gap-2">
              <code className="truncate font-mono text-xs text-foreground">{targetPath}</code>
              <Button size="sm" variant="outline" onClick={() => copy(targetPath, "prompt")}>
                {copied === "prompt" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-primary/40 bg-background/40 p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="font-display text-xs uppercase tracking-wider text-primary">
                Step 2 — Final HTML ({html.length.toLocaleString()} chars)
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || !html}
                onClick={() => copy(html, "html")}
              >
                {copied === "html" ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <Copy className="mr-1 h-3 w-3" />
                )}
                Copy HTML
              </Button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching stored file…
              </div>
            ) : (
              <Textarea
                value={html}
                readOnly
                rows={10}
                className="font-mono text-[10px] leading-snug"
              />
            )}
          </div>

          <div className="rounded-md border border-primary/60 bg-primary/5 p-3">
            <div className="mb-1 font-display text-xs uppercase tracking-wider text-primary">
              Step 3 — Paste this in Lovable chat
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Send the message below to Lovable, then paste the copied HTML when asked. Lovable
              commits the file; GitHub sync picks it up automatically.
            </p>
            <div className="flex items-start gap-2">
              <code className="flex-1 whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-[11px] text-foreground">
                {promptText}
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(promptText, "prompt")}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileDown className="h-3 w-3" />
            Once the file exists at <span className="font-mono text-primary">{targetPath}</span>,
            <code className="font-mono text-primary">/play/{game.slug}</code> serves it from the
            repo instead of Storage.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportToRepoDialog;
