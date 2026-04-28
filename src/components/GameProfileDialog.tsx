// "Game profile" panel used in the admin dashboard. Given a key
// (`builtin:<id>` or `custom:<row-id>`) it shows the cover, title,
// description, category (the in-hub "section": tycoon / twist / other)
// and credits. Both built-ins and custom games are editable:
//   - custom games update their own row in `custom_games`
//   - built-ins write into `game_overrides`, which `useAllGames` merges
//     on top of the static metadata in `src/lib/games.ts`.

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, Save, RotateCcw } from "lucide-react";
import { GAMES, type GameMeta } from "@/lib/games";
import type { CustomGameRow } from "@/hooks/useCustomGames";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["tycoon", "twist", "other", "education"] as const;
type Category = (typeof CATEGORIES)[number];

interface GameProfileDialogProps {
  gameKey: string | null;
  customGames: CustomGameRow[];
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its list. */
  onSaved?: () => void;
}

// Loose-typed handle to the new `game_overrides` table (not in generated types yet).
const overridesTable = () =>
  (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)("game_overrides");

const GameProfileDialog = ({ gameKey, customGames, onClose, onSaved }: GameProfileDialogProps) => {
  const isBuiltin = gameKey?.startsWith("builtin:") ?? false;
  const isCustom = gameKey?.startsWith("custom:") ?? false;

  const builtin: GameMeta | null = isBuiltin
    ? GAMES.find((g) => g.id === gameKey!.slice("builtin:".length)) ?? null
    : null;
  const custom: CustomGameRow | null = isCustom
    ? customGames.find((r) => r.id === gameKey!.slice("custom:".length)) ?? null
    : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [credits, setCredits] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [overrideId, setOverrideId] = useState<string | null>(null);

  // Load fields when opening a custom game.
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
    setOverrideId(null);
  }, [custom]);

  // Load fields + any existing override when opening a built-in game.
  useEffect(() => {
    if (!builtin) return;
    let active = true;
    (async () => {
      const { data } = await overridesTable()
        .select("*")
        .eq("game_id", builtin.id)
        .maybeSingle();
      if (!active) return;
      const o = data as { id: string; title: string | null; description: string | null; credits: string | null; category: string | null; cover_url: string | null } | null;
      setTitle(o?.title ?? builtin.title);
      setDescription(o?.description ?? builtin.description);
      const cat = o?.category ?? builtin.category;
      setCategory((CATEGORIES as readonly string[]).includes(cat) ? (cat as Category) : "other");
      setCredits(o?.credits ?? builtin.credits ?? "");
      setCoverUrl(o?.cover_url ?? "");
      setOverrideId(o?.id ?? null);
    })();
    return () => { active = false; };
  }, [builtin]);

  const open = !!(builtin || custom);

  const cover = coverUrl || builtin?.cover || null;
  const playUrl = builtin?.playUrl ?? (custom ? `/play/${custom.slug}` : "");
  const slug = builtin?.id ?? custom?.slug ?? "";
  const available = builtin?.available ?? (custom ? custom.html.trim().length > 0 : false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (custom) {
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
    } else if (builtin) {
      const payload = {
        game_id: builtin.id,
        title: title.trim(),
        description: description.trim(),
        category,
        credits: credits.trim(),
        cover_url: coverUrl.trim() || null,
      };
      const { error } = await overridesTable().upsert(payload, { onConflict: "game_id" });
      setSaving(false);
      if (error) {
        toast({ title: "Save failed", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      setSaving(false);
      return;
    }
    toast({ title: "Profile saved" });
    onSaved?.();
    onClose();
  };

  const handleResetBuiltin = async () => {
    if (!builtin) return;
    setSaving(true);
    const { error } = await overridesTable().delete().eq("game_id", builtin.id);
    setSaving(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Reset to defaults" });
    onSaved?.();
    onClose();
  };

  const editable = !!(builtin || custom);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        {(builtin || custom) && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-primary">
                {title || builtin?.title}
                <span className="ml-2 rounded border border-primary/40 px-1.5 py-0.5 align-middle font-display text-[10px] uppercase tracking-wider text-primary">
                  {builtin ? (overrideId ? "Built-in (overridden)" : "Built-in") : "Custom"}
                </span>
              </DialogTitle>
            </DialogHeader>

            {cover && (
              <img
                src={cover}
                alt={`${title || builtin?.title} cover`}
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

              <Label htmlFor="gp-title" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Title
              </Label>
              <div className="pt-2">
                <Input id="gp-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
              </div>

              <Label className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Section
              </Label>
              <div className="pt-2">
                <div className="flex flex-wrap gap-2">
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
              </div>

              <Label htmlFor="gp-desc" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <div className="pt-2">
                <Textarea id="gp-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
              </div>

              <Label htmlFor="gp-credits" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Credits
              </Label>
              <div className="pt-2">
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
              </div>

              <Label htmlFor="gp-cover" className="pt-3 font-display text-[11px] uppercase tracking-wider text-muted-foreground">
                Cover URL
              </Label>
              <div className="pt-2">
                <Input
                  id="gp-cover"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder={builtin ? "Leave empty to use the default cover" : "https://..."}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {playUrl && available && (
                <Button asChild variant="outline" size="sm">
                  <a href={playUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Open game
                  </a>
                </Button>
              )}
              {builtin && overrideId && (
                <Button variant="outline" size="sm" onClick={handleResetBuiltin} disabled={saving}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reset to defaults
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              {editable && (
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
