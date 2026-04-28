// "Game profile" panel used in the admin dashboard. Given a key
// (`builtin:<id>` or `custom:<row-id>`) it shows the cover, title,
// description, category (the in-hub "section": tycoon / twist / other)
// and credits. For custom games the fields are editable inline so admins
// can update things without going to the full editor — built-ins stay
// read-only because their data lives in `src/lib/games.ts`.

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, Save } from "lucide-react";
import { GAMES, type GameMeta } from "@/lib/games";
import type { CustomGameRow } from "@/hooks/useCustomGames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["tycoon", "twist", "other"] as const;
type Category = (typeof CATEGORIES)[number];

interface GameProfileDialogProps {
  gameKey: string | null;
  customGames: CustomGameRow[];
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its list. */
  onSaved?: () => void;
}

const GameProfileDialog = ({ gameKey, customGames, onClose, onSaved }: GameProfileDialogProps) => {
  const isBuiltin = gameKey?.startsWith("builtin:") ?? false;
  const isCustom = gameKey?.startsWith("custom:") ?? false;

  const builtin: GameMeta | null = isBuiltin
    ? GAMES.find((g) => g.id === gameKey!.slice("builtin:".length)) ?? null
    : null;
  const custom: CustomGameRow | null = isCustom
    ? customGames.find((r) => r.id === gameKey!.slice("custom:".length)) ?? null
    : null;

  // Editable fields — only used when `custom` is set.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [credits, setCredits] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Reload form whenever a different custom game is opened.
  useEffect(() => {
    if (!custom) return;
    setTitle(custom.title);
    setDescription(custom.description);
    setCategory(
      (CATEGORIES as readonly string[]).includes(custom.category)
        ? (custom.category as Category)
        : "other",
    );
    setCredits(custom.credits ?? "");
    setCoverUrl(custom.cover_url ?? "");
  }, [custom]);

  const open = !!(builtin || custom);

  const cover = builtin?.cover ?? coverUrl ?? null;
  const playUrl = builtin?.playUrl ?? (custom ? `/play/${custom.slug}` : "");
  const slug = builtin?.id ?? custom?.slug ?? "";
  const available = builtin?.available ?? (custom ? custom.html.trim().length > 0 : false);

  const handleSave = async () => {
    if (!custom) return;
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("custom_games")
      .update({
        title: title.trim(),
        description: description.trim(),
        category,
        credits: credits.trim(),
        cover_url: coverUrl.trim() || null,
      })
      .eq("id", custom.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile saved" });
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        {(builtin || custom) && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-primary">
                {builtin?.title ?? title}
                <span className="ml-2 rounded border border-primary/40 px-1.5 py-0.5 align-middle font-display text-[10px] uppercase tracking-wider text-primary">
                  {builtin ? "Built-in (read-only)" : "Custom (editable)"}
                </span>
              </DialogTitle>
            </DialogHeader>

            {cover && (
              <img
                src={cover}
                alt={`${builtin?.title ?? title} cover`}
                className="h-44 w-full rounded-md border border-primary/40 object-cover"
              />
            )}

            <div className="mt-2 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
              <Label className="pt-2 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Slug
              </Label>
              <div className="pt-2 font-mono text-primary">{slug}</div>

              <Label className="pt-2 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <div className="pt-2">
                {available ? (
                  <span className="text-primary">Playable</span>
                ) : (
                  <span className="text-muted-foreground">Not playable yet</span>
                )}
              </div>

              <Label className="pt-2 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Play URL
              </Label>
              <div className="pt-2 font-mono text-xs text-primary">
                {playUrl || <span className="text-muted-foreground">—</span>}
              </div>

              {/* Title */}
              <Label htmlFor="gp-title" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Title
              </Label>
              <div className="pt-2">
                {custom ? (
                  <Input
                    id="gp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                  />
                ) : (
                  <span className="text-foreground">{builtin?.title}</span>
                )}
              </div>

              {/* Category — what the user calls "location": tycoon / twist / other */}
              <Label className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Section
              </Label>
              <div className="pt-2">
                {custom ? (
                  <div className="flex gap-2">
                    {CATEGORIES.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        size="sm"
                        variant={category === c ? "default" : "outline"}
                        onClick={() => setCategory(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <span className="text-foreground">{builtin?.category}</span>
                )}
              </div>

              {/* Description */}
              <Label htmlFor="gp-desc" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <div className="pt-2">
                {custom ? (
                  <Textarea
                    id="gp-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    maxLength={500}
                  />
                ) : (
                  <span className="text-foreground">{builtin?.description}</span>
                )}
              </div>

              {/* Credits */}
              <Label htmlFor="gp-credits" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Credits
              </Label>
              <div className="pt-2">
                {custom ? (
                  <>
                    <Textarea
                      id="gp-credits"
                      value={credits}
                      onChange={(e) => setCredits(e.target.value)}
                      placeholder="e.g. Code: Alex · Art: Sam"
                      rows={2}
                      maxLength={500}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Shown on the hub card as "by {credits.trim() || "—"}"
                    </p>
                  </>
                ) : builtin?.credits ? (
                  <span className="whitespace-pre-wrap text-foreground">{builtin.credits}</span>
                ) : (
                  <span className="text-muted-foreground">No credits recorded.</span>
                )}
              </div>

              {/* Cover URL — quick swap (admin can also use the full editor for upload) */}
              {custom && (
                <>
                  <Label htmlFor="gp-cover" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                    Cover URL
                  </Label>
                  <div className="pt-2">
                    <Input
                      id="gp-cover"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              {playUrl && available && (
                <Button asChild variant="outline" size="sm">
                  <a href={playUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Open game
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                {custom ? "Cancel" : "Close"}
              </Button>
              {custom && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GameProfileDialog;
