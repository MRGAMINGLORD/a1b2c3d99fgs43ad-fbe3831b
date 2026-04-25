import { useEffect, useState } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import CoverImagePicker from "@/components/CoverImagePicker";
import type { CustomGameRow } from "@/hooks/useCustomGames";
import { GAMES } from "@/lib/games";

const CATEGORIES = ["tycoon", "twist", "other"] as const;
const BUILTIN_SLUGS = new Set(GAMES.map((g) => g.id));

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const CustomGamesAdmin = () => {
  const [rows, setRows] = useState<CustomGameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("other");
  const [html, setHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_games")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error loading custom games", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as CustomGameRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setCoverUrl("");
    setCategory("other");
    setHtml("");
  };

  const startEdit = (row: CustomGameRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setDescription(row.description);
    setCoverUrl(row.cover_url ?? "");
    setCategory(
      (CATEGORIES as readonly string[]).includes(row.category)
        ? (row.category as (typeof CATEGORIES)[number])
        : "other",
    );
    setHtml(row.html);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const slug = editingId
      ? rows.find((r) => r.id === editingId)?.slug ?? slugify(title)
      : slugify(title);

    // Block slug collisions with built-in games (only when creating new — existing
    // rows keep their slug, and seeded built-in copies are intentional).
    if (!editingId && BUILTIN_SLUGS.has(slug)) {
      toast({
        title: "Slug conflicts with a built-in game",
        description: `"${slug}" is already used by a built-in. Pick a different title (e.g. "${title} 2") so the URL /play/${slug} stays unique.`,
        variant: "destructive",
      });
      return;
    }

    // Confirm before saving so admins don't post placeholder games by accident.
    const confirmMsg = editingId
      ? `Save changes to "${title.trim()}"?`
      : `Post "${title.trim()}" as a new game at /play/${slug}?`;
    if (!confirm(confirmMsg)) return;

    setSubmitting(true);

    if (editingId) {
      const { error } = await supabase
        .from("custom_games")
        .update({
          title: title.trim(),
          description: description.trim(),
          cover_url: coverUrl.trim() || null,
          category,
          html,
        })
        .eq("id", editingId);
      setSubmitting(false);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Game updated" });
    } else {
      const { error } = await supabase.from("custom_games").insert({
        slug,
        title: title.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim() || null,
        category,
        html,
      });
      setSubmitting(false);
      if (error) {
        toast({
          title: "Error",
          description: error.message.includes("duplicate")
            ? `A game with the slug "${slug}" already exists. Pick a different title.`
            : error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Game posted", description: `Now editable & playable at /play/${slug}` });
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this custom game? This can't be undone.")) return;
    const { error } = await supabase.from("custom_games").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (editingId === id) resetForm();
    load();
  };

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-xl text-primary">
        {editingId ? "Edit Custom Game" : "Post New Custom Game"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="cg-title">Title</Label>
          <Input
            id="cg-title"
            placeholder="My New Game"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <CoverImagePicker
          value={coverUrl}
          onChange={setCoverUrl}
          hint={title}
        />
        <div>
          <Label htmlFor="cg-desc">Description</Label>
          <Textarea
            id="cg-desc"
            placeholder="Short description shown on the hub card."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </div>
        <div>
          <Label>Category</Label>
          <div className="mt-1 flex gap-2">
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
        <div>
          <Label htmlFor="cg-html">Game HTML</Label>
          <Textarea
            id="cg-html"
            placeholder="Paste the full <html>...</html> of your game here. You can leave this empty when posting and fill it in later — the game card will show 'Coming Soon' until code is added."
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={8}
            className="font-mono text-xs"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            The HTML runs inside a sandboxed iframe on /play/{slugify(title) || "your-slug"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            <Plus className="mr-1 h-4 w-4" />
            {editingId ? "Save Changes" : "Post Game"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel edit
            </Button>
          )}
        </div>
      </form>

      <div className="mt-8">
        <h3 className="mb-3 font-display text-sm uppercase tracking-wider text-primary">
          Custom Games ({rows.length})
        </h3>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom games yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border border-primary/40 bg-background/40 p-3"
              >
                <div className="min-w-0">
                  <div className="font-display text-sm text-primary">{r.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    /play/{r.slug} · {r.category} ·{" "}
                    {r.html.trim().length > 0 ? "playable" : "no code yet"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                    <Pencil className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomGamesAdmin;
