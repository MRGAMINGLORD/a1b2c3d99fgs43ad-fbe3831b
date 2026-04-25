import { useEffect, useMemo, useState } from "react";
import { Code2, Send, Trash2, Lock, Loader2, Plus, Eye, EyeOff, Wrench, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTestGames, type TestGameRow } from "@/hooks/useTestGames";
import {
  isTestUnlocked,
  unlockTest,
  isEditUnlocked,
  unlockEdit,
} from "@/lib/testAuth";
import CoverImagePicker from "@/components/CoverImagePicker";
import GameCard from "@/components/GameCard";
import { GAMES, type GameMeta } from "@/lib/games";
import heroBg from "@/assets/hero-bg.png";

const CATEGORIES = ["tycoon", "twist", "other"] as const;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// ---------- Password gate ----------
const TestGate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  const tryUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockTest(pw)) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPw("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={tryUnlock}
        className="w-full max-w-sm space-y-4 rounded-lg border border-primary/40 bg-card/60 p-6 border-glow"
      >
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl uppercase tracking-wider text-primary">
            Test Mode Locked
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter the test password to access the staging environment.
        </p>
        <Input
          type="password"
          autoFocus
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className={error ? "border-destructive" : ""}
        />
        {error && <p className="text-xs text-destructive">Wrong password.</p>}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Unlock
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/">Back</Link>
          </Button>
        </div>
      </form>
    </div>
  );
};

// ---------- Edit-code password gate (modal) ----------
const EditPasswordDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) => {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockEdit(pw)) {
      setPw("");
      setErr(false);
      onOpenChange(false);
      onSuccess();
    } else {
      setErr(true);
      setPw("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit code — password required</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            autoFocus
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className={err ? "border-destructive" : ""}
          />
          {err && <p className="text-xs text-destructive">Wrong password.</p>}
          <DialogFooter>
            <Button type="submit">Unlock</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Edit game modal (with safe Preview) ----------
const EditGameDialog = ({
  game,
  open,
  onOpenChange,
  onSaved,
}: {
  game: TestGameRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("other");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRefreshKey = useMemo(() => ({ current: 0 }), []);

  // Sync when opened with a different game
  if (game && open && title === "" && description === "" && html === "" && coverUrl === "") {
    setTitle(game.title);
    setDescription(game.description);
    setCoverUrl(game.cover_url ?? "");
    setCategory(
      (CATEGORIES as readonly string[]).includes(game.category)
        ? (game.category as (typeof CATEGORIES)[number])
        : "other",
    );
    setHtml(game.html);
  }

  const cleanupPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setTitle(""); setDescription(""); setCoverUrl(""); setHtml(""); setCategory("other");
      setPreviewOpen(false);
      cleanupPreview();
    }
    onOpenChange(v);
  };

  const runPreview = () => {
    cleanupPreview();
    if (!html.trim()) {
      toast({ title: "Nothing to preview", description: "Paste some HTML first.", variant: "destructive" });
      return;
    }
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewOpen(true);
    previewRefreshKey.current += 1;
  };

  // Revoke blob on dialog close
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!game) return;
    setSaving(true);
    const { error } = await supabase
      .from("test_custom_games")
      .update({
        title: title.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim() || null,
        category,
        html,
      })
      .eq("id", game.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved to TEST" });
    handleClose(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit: {game?.title ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[72vh] gap-4 overflow-y-auto md:grid-cols-2">
          {/* Left: form */}
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
            </div>
            <CoverImagePicker value={coverUrl} onChange={setCoverUrl} hint={title} />
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
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
              <div className="flex items-center justify-between">
                <Label>Game code (HTML)</Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={runPreview}>
                    {previewOpen ? <RefreshCw className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                    {previewOpen ? "Refresh preview" : "Preview"}
                  </Button>
                  {previewOpen && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setPreviewOpen(false); cleanupPreview(); }}>
                      <EyeOff className="mr-1 h-3 w-3" />
                      Hide
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                rows={14}
                className="mt-1 font-mono text-xs"
                placeholder="<html>...</html>"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Preview renders the HTML in a sandboxed iframe. Nothing is posted to live until you save and click "Post to live".
              </p>
            </div>
          </div>

          {/* Right: live preview pane */}
          <div className="flex flex-col">
            <Label className="mb-1">Preview</Label>
            <div className="relative flex-1 overflow-hidden rounded-md border border-primary/40 bg-card">
              {previewOpen && previewUrl ? (
                <iframe
                  key={previewRefreshKey.current}
                  src={previewUrl}
                  title={`${title} preview`}
                  className="h-full min-h-[420px] w-full border-0 bg-background"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  allow="fullscreen; autoplay; gamepad"
                />
              ) : (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                  <Eye className="h-8 w-8 opacity-60" />
                  <p className="font-display text-xs uppercase tracking-wider">Preview is hidden</p>
                  <p className="text-xs">
                    Click <span className="font-display text-primary">Preview</span> to render your edits without posting.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------- New game dialog ----------
const NewGameDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const slug = slugify(title);
    const { error } = await supabase.from("test_custom_games").insert({
      slug,
      title: title.trim(),
      description: "",
      html: "",
      category: "other",
    });
    setBusy(false);
    if (error) {
      toast({
        title: "Could not create",
        description: error.message.includes("duplicate")
          ? `A test game with slug "${slug}" already exists.`
          : error.message,
        variant: "destructive",
      });
      return;
    }
    setTitle("");
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        New test game
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New test game</DialogTitle>
        </DialogHeader>
        <form onSubmit={create} className="space-y-3">
          <Input
            placeholder="Title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            required
          />
          <DialogFooter>
            <Button type="submit" disabled={busy}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------- Hub-style card with optional manage overlay ----------
const TestHubCard = ({
  meta,
  testRow,
  manage,
  onEdit,
  onPost,
  onDelete,
}: {
  meta: GameMeta;
  testRow?: TestGameRow;
  manage: boolean;
  onEdit?: (g: TestGameRow) => void;
  onPost?: (g: TestGameRow) => void;
  onDelete?: (g: TestGameRow) => void;
}) => {
  // Render same look as live hub
  return (
    <div className="relative">
      <GameCard
        title={meta.title}
        description={meta.description}
        cover={meta.cover}
        available={meta.available}
        playUrl={meta.playUrl}
      />
      {manage && testRow && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-3">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-md border border-primary/60 bg-background/90 p-1 shadow-lg backdrop-blur">
            <Button size="sm" variant="secondary" onClick={() => onEdit?.(testRow)}>
              <Code2 className="mr-1 h-3 w-3" />
              Edit
            </Button>
            <Button
              size="sm"
              onClick={() => onPost?.(testRow)}
              disabled={!testRow.html.trim()}
              title={testRow.html.trim() ? "Promote to live" : "Add code first"}
            >
              <Send className="mr-1 h-3 w-3" />
              Post live
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete?.(testRow)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Main page ----------
const testRowToMeta = (row: TestGameRow): GameMeta => ({
  id: row.slug,
  title: row.title,
  description: row.description,
  cover: row.cover_url || "/placeholder.svg",
  available: row.html.trim().length > 0,
  playUrl: `/play-test/${row.slug}`,
  category:
    row.category === "tycoon" || row.category === "twist" ? row.category : "other",
});

const Test = () => {
  const [unlocked, setUnlocked] = useState(isTestUnlocked());
  const { rows, loading, reload } = useTestGames();
  const [editPwOpen, setEditPwOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<TestGameRow | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);

  if (!unlocked) return <TestGate onUnlock={() => setUnlocked(true)} />;

  const requestEdit = (g: TestGameRow) => {
    setEditingGame(g);
    if (isEditUnlocked()) {
      setEditorOpen(true);
    } else {
      setEditPwOpen(true);
    }
  };

  const handlePost = async (g: TestGameRow) => {
    if (!confirm(`Post "${g.title}" to the LIVE hub? This will overwrite any existing live game with the same slug.`)) return;
    const { error } = await supabase.from("custom_games").upsert(
      {
        slug: g.slug,
        title: g.title,
        description: g.description,
        cover_url: g.cover_url,
        html: g.html,
        category: g.category,
      },
      { onConflict: "slug" },
    );
    if (error) {
      toast({ title: "Post failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Posted to live", description: `Now playable at /play/${g.slug}` });
  };

  const handleDelete = async (g: TestGameRow) => {
    if (!confirm(`Delete "${g.title}" from TEST? (This does not affect live.)`)) return;
    const { error } = await supabase.from("test_custom_games").delete().eq("id", g.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    reload();
  };

  // Build the same category buckets the live hub uses, but populated from
  // the registry PLUS the test_custom_games table.
  const testMetas = rows.map(testRowToMeta);
  const testRowBySlug = new Map(rows.map((r) => [r.slug, r]));
  const allGames: GameMeta[] = [...GAMES, ...testMetas];
  const tycoonGames = allGames.filter((g) => g.category === "tycoon");
  const twistGames = allGames.filter((g) => g.category === "twist");
  const otherGames = allGames.filter((g) => g.category === "other");

  const renderGrid = (list: GameMeta[]) => (
    <div className="grid gap-6 pt-2 sm:grid-cols-2">
      {list.map((g) => (
        <TestHubCard
          key={g.id}
          meta={g}
          testRow={testRowBySlug.get(g.id)}
          manage={manageMode}
          onEdit={requestEdit}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — mirrors live hub but labelled TEST MODE */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        <div className="relative z-10 px-6 text-center">
          <h1 className="mb-2 font-display text-6xl tracking-tight text-primary text-glow sm:text-8xl">
            APOCALYPSE WAFFLE
          </h1>
          <p className="font-display text-sm uppercase tracking-[0.4em] text-destructive">
            ⚠ TEST MODE — staging build
          </p>
          <p className="mx-auto mt-3 max-w-xl text-base text-primary">
            Same hub layout as live. Edit games here, preview safely, then "Post to live" to sync them to the public site.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/">← Back to live hub</Link>
            </Button>
            <NewGameDialog onCreated={reload} />
            <Button
              variant={manageMode ? "default" : "outline"}
              onClick={() => setManageMode((m) => !m)}
            >
              <Wrench className="mr-1 h-4 w-4" />
              {manageMode ? "Manage: ON" : "Manage"}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Toggle <span className="font-display text-primary">Manage</span> to reveal Edit / Post / Delete on each card.
          </p>
        </div>
      </section>

      {/* Games — same accordion structure as the live hub */}
      <section className="mx-auto max-w-5xl px-6 pb-12 pt-10">
        <h2 className="mb-6 text-center font-display text-3xl text-primary sm:text-4xl">
          Games {loading && <span className="text-sm text-muted-foreground">(loading...)</span>}
        </h2>

        <Accordion
          type="multiple"
          defaultValue={["tycoon", "twist", "other"]}
          className="space-y-3"
        >
          <AccordionItem
            value="tycoon"
            className="rounded-lg border border-primary/40 bg-card/40 px-4 border-glow"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="text-left">
                <div className="font-display text-xl uppercase tracking-wider text-primary">
                  Tycoon Games
                </div>
                <div className="text-xs italic text-muted-foreground">
                  tycoons that slowly grow with weird twists
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderGrid(tycoonGames)}</AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="twist"
            className="rounded-lg border border-primary/40 bg-card/40 px-4 border-glow"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="text-left">
                <div className="font-display text-xl uppercase tracking-wider text-primary">
                  Waffly Twists
                </div>
                <div className="text-xs italic text-muted-foreground">
                  special twists on popular games
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderGrid(twistGames)}</AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="other"
            className="rounded-lg border border-primary/40 bg-card/40 px-4 border-glow"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="text-left">
                <div className="font-display text-xl uppercase tracking-wider text-primary">
                  Other Games
                </div>
                <div className="text-xs italic text-muted-foreground">
                  some were built by us but most aren't
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>{renderGrid(otherGames)}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <EditPasswordDialog
        open={editPwOpen}
        onOpenChange={setEditPwOpen}
        onSuccess={() => setEditorOpen(true)}
      />
      <EditGameDialog
        game={editingGame}
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v);
          if (!v) setEditingGame(null);
        }}
        onSaved={reload}
      />
    </div>
  );
};

export default Test;
