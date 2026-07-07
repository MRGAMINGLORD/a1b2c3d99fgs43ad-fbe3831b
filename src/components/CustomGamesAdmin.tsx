import { useEffect, useRef, useState } from "react";
import { Trash2, Plus, Pencil, FileCode, Eye, FolderUp, X, Upload, FileArchive } from "lucide-react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import CoverImagePicker from "@/components/CoverImagePicker";
import GameProfileDialog from "@/components/GameProfileDialog";
import type { CustomGameRow } from "@/hooks/useCustomGames";
import { GAMES } from "@/lib/games";
import { prepareGameSource, looksLikeReact } from "@/lib/reactGameWrapper";

// Files whose type is not detected by the browser get a best-effort
// content-type from their extension. Everything else falls back to
// `application/octet-stream`, which the iframe won't execute but which is
// safe to store.
const EXT_CONTENT_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "video/webm",
  mp4: "video/mp4",
  wasm: "application/wasm",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  tsx: "text/plain; charset=utf-8",
  ts: "text/plain; charset=utf-8",
  jsx: "text/plain; charset=utf-8",
  gitignore: "text/plain; charset=utf-8",
};

const contentTypeFor = (file: File, relPath: string): string => {
  if (file.type) return file.type;
  const ext = relPath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_CONTENT_TYPES[ext] ?? "application/octet-stream";
};

// Chrome/Edge/Safari expose the folder-relative path via a nonstandard
// property. Fall back to plain name for multi-file picks.
const relPathOf = (f: File): string => {
  const rel = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath;
  if (rel && rel.length > 0) {
    // Strip the top-level folder so uploads land at <slug>/<file>, not
    // <slug>/<folder-name>/<file>.
    const idx = rel.indexOf("/");
    return idx >= 0 ? rel.slice(idx + 1) : rel;
  }
  return f.name;
};



const CATEGORIES = ["tycoon", "twist", "other"] as const;
const BUILTIN_SLUGS = new Set(GAMES.map((g) => g.id));
const GAME_FILES_BUCKET = "game-files";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

// A custom game's `html` field can hold either inline HTML (legacy) OR a
// URL to a real file in Storage (new behavior). Detect & display accordingly.
const isStoredFileUrl = (s: string) =>
  /^https?:\/\//i.test(s.trim()) && s.includes(`/${GAME_FILES_BUCKET}/`);

const CustomGamesAdmin = () => {
  const [rows, setRows] = useState<CustomGameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("other");
  const [html, setHtml] = useState("");
  const [credits, setCredits] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Bundle uploads: full folder or hand-picked files. When present, these
  // are uploaded verbatim into game-files/<slug>/… and take precedence over
  // any HTML pasted into the source textarea.
  const [bundleFiles, setBundleFiles] = useState<File[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  // Profile viewer state — shows the cover, description, location, credits, etc.
  const [profileGameKey, setProfileGameKey] = useState<string | null>(null);

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
    setCredits("");
    setBundleFiles([]);
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (filesInputRef.current) filesInputRef.current.value = "";
  };

  const startEdit = async (row: CustomGameRow) => {
    setEditingId(row.id);
    setTitle(row.title);
    setDescription(row.description);
    setCoverUrl(row.cover_url ?? "");
    setCategory(
      (CATEGORIES as readonly string[]).includes(row.category)
        ? (row.category as (typeof CATEGORIES)[number])
        : "other",
    );
    setCredits(row.credits ?? "");

    // If the stored value is a URL pointing at our Storage bucket, fetch the
    // actual file so the admin can edit the real source — otherwise show the
    // inline HTML as-is (legacy rows).
    if (isStoredFileUrl(row.html)) {
      try {
        const res = await fetch(row.html);
        const text = await res.text();
        setHtml(text);
      } catch {
        setHtml("");
        toast({
          title: "Could not fetch stored game file",
          description: "You can re-paste the HTML and save to upload a fresh copy.",
          variant: "destructive",
        });
      }
    } else {
      setHtml(row.html);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Upload the HTML as /<slug>/index.html in the public game-files bucket
  // and return the public URL — same shape as the built-in /games/<slug>/index.html.
  //
  // We REMOVE any existing object first, then upload fresh. Supabase Storage
  // caches the original `Content-Type` from the first insert at a path; an
  // upsert won't update it. Without a clean re-insert, files end up served
  // as `text/plain` + `nosniff`, which makes the browser display raw source
  // in the iframe instead of rendering the HTML game.
  const uploadGameFile = async (slug: string, source: string): Promise<string> => {
    const path = `${slug}/index.html`;
    // Best-effort cleanup; ignore "not found" errors.
    await supabase.storage.from(GAME_FILES_BUCKET).remove([path]).catch(() => {});
    const blob = new Blob([source], { type: "text/html; charset=utf-8" });
    const { error } = await supabase.storage
      .from(GAME_FILES_BUCKET)
      .upload(path, blob, {
        upsert: true,
        contentType: "text/html; charset=utf-8",
        cacheControl: "60",
      });
    if (error) throw error;
    const { data } = supabase.storage.from(GAME_FILES_BUCKET).getPublicUrl(path);
    // Cache-bust so admins immediately see edits in the iframe.
    return `${data.publicUrl}?v=${Date.now()}`;
  };

  // Upload every file in a picked folder (or hand-picked file list) into
  // game-files/<slug>/<relative-path>. Returns the public URL of the entry
  // file — index.html at the root when available, otherwise the first .html
  // encountered, otherwise the first file (rare — usually a missing entry).
  const uploadBundle = async (
    slug: string,
    files: File[],
  ): Promise<string> => {
    // Clean up the whole folder first so removed files don't linger.
    const existing = await supabase.storage
      .from(GAME_FILES_BUCKET)
      .list(slug, { limit: 1000 });
    if (existing.data && existing.data.length > 0) {
      const toRemove = existing.data.map((o) => `${slug}/${o.name}`);
      await supabase.storage.from(GAME_FILES_BUCKET).remove(toRemove).catch(() => {});
    }

    let entryPath: string | null = null;
    for (const file of files) {
      const rel = relPathOf(file);
      const path = `${slug}/${rel}`;
      const type = contentTypeFor(file, rel);
      const { error } = await supabase.storage
        .from(GAME_FILES_BUCKET)
        .upload(path, file, { upsert: true, contentType: type, cacheControl: "60" });
      if (error) throw new Error(`${rel}: ${error.message}`);
      if (rel === "index.html") entryPath = path;
      else if (!entryPath && rel.toLowerCase().endsWith(".html")) entryPath = path;
    }
    if (!entryPath) {
      // Fall back to the first uploaded file so the row at least records something.
      entryPath = `${slug}/${relPathOf(files[0])}`;
    }
    const { data } = supabase.storage.from(GAME_FILES_BUCKET).getPublicUrl(entryPath);
    return `${data.publicUrl}?v=${Date.now()}`;
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

    if (!editingId && BUILTIN_SLUGS.has(slug)) {
      toast({
        title: "Slug conflicts with a built-in game",
        description: `"${slug}" is already used by a built-in. Pick a different title (e.g. "${title} 2") so the URL /play/${slug} stays unique.`,
        variant: "destructive",
      });
      return;
    }

    const usingBundle = bundleFiles.length > 0;

    setSubmitting(true);

    let storedValue = "";
    try {
      if (usingBundle) {
        // Folder / multi-file upload wins — ignore any pasted HTML.
        storedValue = await uploadBundle(slug, bundleFiles);
      } else if (html.trim()) {
        // Auto-wrap pasted React/JSX into a self-contained HTML doc so it
        // runs in the same iframe used for built-in HTML games.
        const finalSource = prepareGameSource(html);
        storedValue = await uploadGameFile(slug, finalSource);
      }
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("custom_games")
        .update({
          title: title.trim(),
          description: description.trim(),
          cover_url: coverUrl.trim() || null,
          category,
          credits: credits.trim(),
          html: storedValue,
        })
        .eq("id", editingId);
      setSubmitting(false);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Game updated", description: storedValue ? `File replaced at /game-files/${slug}/index.html` : "Saved without code." });
    } else {
      const { error } = await supabase.from("custom_games").insert({
        slug,
        title: title.trim(),
        description: description.trim(),
        cover_url: coverUrl.trim() || null,
        category,
        credits: credits.trim(),
        html: storedValue,
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
      toast({
        title: "Game posted",
        description: storedValue
          ? `Game saved and playable at /play/${slug}`
          : `Created at /play/${slug} (no code yet).`,
      });
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (!confirm(`Delete "${row.title}"? The file at /game-files/${row.slug}/index.html will also be removed. This can't be undone.`)) return;

    // Best-effort delete of the storage file; don't block DB delete on failure.
    if (isStoredFileUrl(row.html)) {
      await supabase.storage.from(GAME_FILES_BUCKET).remove([`${row.slug}/index.html`]);
    }
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
        <div className="rounded-md border border-primary/40 bg-background/40 p-3">
          <Label className="font-display text-xs uppercase tracking-wider text-primary">
            Upload folder or files (optional)
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a whole folder — every file (HTML, CSS, JS, TSX, JSON,
            .gitignore, images, audio…) uploads to <span className="font-mono text-primary">/game-files/{slugify(title) || "your-slug"}/</span>.
            The entry point is <span className="font-mono">index.html</span> (or the first
            .html found). When files are picked here they take precedence over the pasted source below.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => folderInputRef.current?.click()}
            >
              <FolderUp className="mr-1 h-4 w-4" /> Pick folder
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => filesInputRef.current?.click()}
            >
              <Upload className="mr-1 h-4 w-4" /> Add files
            </Button>
            {bundleFiles.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBundleFiles([]);
                  if (folderInputRef.current) folderInputRef.current.value = "";
                  if (filesInputRef.current) filesInputRef.current.value = "";
                }}
              >
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </div>
          <input
            ref={folderInputRef}
            type="file"
            multiple
            hidden
            // Nonstandard but supported in Chromium/WebKit for folder selection.
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length > 0) setBundleFiles(list);
            }}
          />
          <input
            ref={filesInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length > 0) {
                setBundleFiles((prev) => [...prev, ...list]);
              }
            }}
          />
          {bundleFiles.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-primary/30 bg-background/60 p-2 font-mono text-[11px]">
              {bundleFiles.map((f, i) => (
                <div key={`${relPathOf(f)}-${i}`} className="flex items-center justify-between gap-2">
                  <span className="truncate text-primary">{relPathOf(f)}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    className="text-destructive hover:opacity-80"
                    onClick={() => setBundleFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${relPathOf(f)}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="mt-1 text-muted-foreground">
                {bundleFiles.length} file(s) ready · entry:{" "}
                <span className="text-primary">
                  {bundleFiles.find((f) => relPathOf(f) === "index.html")
                    ? "index.html"
                    : bundleFiles.find((f) => relPathOf(f).toLowerCase().endsWith(".html"))
                      ? relPathOf(bundleFiles.find((f) => relPathOf(f).toLowerCase().endsWith(".html"))!)
                      : "⚠ no .html found"}
                </span>
              </div>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="cg-html">
            Game source — HTML or React/JSX {bundleFiles.length > 0 && <span className="text-muted-foreground">(ignored while files are picked above)</span>}
          </Label>
          <Textarea
            id="cg-html"
            placeholder="Paste either a full <html>...</html> document OR a React component (e.g. function Game() { return <div>…</div> } — with or without `export default`). React snippets are auto-wrapped with React + Babel CDN scripts so they run in the same /play/<slug> tab."
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={8}
            className="font-mono text-xs"
            disabled={bundleFiles.length > 0}
          />
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <FileCode className="h-3 w-3" />
            Saved automatically when you post; playable at <span className="font-mono text-primary">/play/{slugify(title) || "your-slug"}</span>
            {html.trim() && looksLikeReact(html) && (
              <span className="ml-2 rounded border border-primary/50 bg-primary/10 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider text-primary">
                React detected — will be auto-wrapped
              </span>
            )}
          </p>
        </div>
        <div>
          <Label htmlFor="cg-credits">Credits</Label>
          <Textarea
            id="cg-credits"
            placeholder="Who made this game? e.g. Code: Alex · Art: Sam · Music: Jordan"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            rows={2}
            maxLength={500}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Shown on the game profile and (eventually) in the in-game credits screen.
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
            {rows.map((r) => {
              const stored = isStoredFileUrl(r.html);
              const hasCode = r.html.trim().length > 0;
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-primary/40 bg-background/40 p-3"
                >
                  <div className="min-w-0">
                    <div className="font-display text-sm text-primary">{r.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      /play/{r.slug} · {r.category} ·{" "}
                      {!hasCode
                        ? "no code yet"
                        : stored
                          ? "file in storage"
                          : "inline (legacy)"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setProfileGameKey(`custom:${r.id}`)}
                      title="View profile"
                    >
                      <Eye className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                      <Pencil className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GameProfileDialog
        gameKey={profileGameKey}
        customGames={rows}
        onClose={() => setProfileGameKey(null)}
        onSaved={load}
      />
    </div>
  );
};

export default CustomGamesAdmin;
