// Admin tool: package every custom game currently in the database into a
// ZIP whose structure mirrors what the repo expects at `public/games/<slug>/`.
// The admin extracts the ZIP into the project root and commits it — after
// that, forks of the app carry those games baked in, no database required.

import { useState } from "react";
import JSZip from "jszip";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { CustomGameRow } from "@/hooks/useCustomGames";

const GAME_FILES_BUCKET = "game-files";

const isStoredFileUrl = (s: string) =>
  /^https?:\/\//i.test(s.trim()) && s.includes(`/${GAME_FILES_BUCKET}/`);

// Recurse into the bucket folder so nested assets (subdirs) also end up in
// the zip. `list()` only returns immediate children, so we walk manually.
const listAllPaths = async (slug: string, sub = ""): Promise<string[]> => {
  const prefix = sub ? `${slug}/${sub}` : slug;
  const { data, error } = await supabase.storage
    .from(GAME_FILES_BUCKET)
    .list(prefix, { limit: 1000 });
  if (error || !data) return [];
  const out: string[] = [];
  for (const entry of data) {
    // Storage marks folders with a null `id`.
    const isFolder = entry.id === null;
    const rel = sub ? `${sub}/${entry.name}` : entry.name;
    if (isFolder) {
      const nested = await listAllPaths(slug, rel);
      out.push(...nested);
    } else {
      out.push(rel);
    }
  }
  return out;
};

const fetchBytes = async (url: string): Promise<ArrayBuffer | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
};

const extFromUrl = (url: string): string => {
  const clean = url.split("?")[0];
  const dot = clean.lastIndexOf(".");
  const slash = clean.lastIndexOf("/");
  if (dot > slash && dot > 0) return clean.slice(dot + 1).toLowerCase();
  return "png";
};

const escapeString = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const buildRegistrySnippet = (
  entries: Array<{ slug: string; title: string; description: string; category: string; credits: string; coverPath: string | null }>,
) =>
  entries
    .map(
      (e) => `  {
    id: "${e.slug}",
    title: "${escapeString(e.title)}",
    description: "${escapeString(e.description)}",
    cover: ${e.coverPath ? `"${e.coverPath}"` : `"/placeholder.svg"`},
    available: true,
    playUrl: "/play/${e.slug}",
    category: "${e.category === "tycoon" || e.category === "twist" ? e.category : "other"}",
    credits: "${escapeString(e.credits)}",
  },`,
    )
    .join("\n");

const ExportGamesAdmin = () => {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const { data: rows, error } = await supabase
        .from("custom_games")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const games = (rows ?? []) as CustomGameRow[];
      if (games.length === 0) {
        toast({ title: "Nothing to export", description: "No custom games in the database yet." });
        setBusy(false);
        return;
      }

      const zip = new JSZip();
      const publicRoot = zip.folder("public")!.folder("games")!;
      const registryEntries: Array<{
        slug: string; title: string; description: string; category: string; credits: string; coverPath: string | null;
      }> = [];

      let totalFiles = 0;
      for (const row of games) {
        const gameFolder = publicRoot.folder(row.slug)!;

        // 1. Game files
        if (isStoredFileUrl(row.html)) {
          const paths = await listAllPaths(row.slug);
          for (const rel of paths) {
            const { data } = supabase.storage
              .from(GAME_FILES_BUCKET)
              .getPublicUrl(`${row.slug}/${rel}`);
            const buf = await fetchBytes(data.publicUrl);
            if (buf) {
              gameFolder.file(rel, buf);
              totalFiles++;
            }
          }
        } else if (row.html.trim()) {
          // Legacy inline HTML — write directly as index.html
          gameFolder.file("index.html", row.html);
          totalFiles++;
        }

        // 2. Cover image
        let coverPath: string | null = null;
        if (row.cover_url && /^https?:\/\//i.test(row.cover_url)) {
          const buf = await fetchBytes(row.cover_url);
          if (buf) {
            const ext = extFromUrl(row.cover_url);
            gameFolder.file(`cover.${ext}`, buf);
            coverPath = `/games/${row.slug}/cover.${ext}`;
            totalFiles++;
          }
        } else if (row.cover_url) {
          // Already a local path — reuse as-is
          coverPath = row.cover_url;
        }

        registryEntries.push({
          slug: row.slug,
          title: row.title,
          description: row.description,
          category: row.category,
          credits: row.credits ?? "",
          coverPath,
        });
      }

      // 3. Registry snippet + README so the admin knows exactly what to do.
      const snippet = buildRegistrySnippet(registryEntries);
      zip.file(
        "REGISTRY_SNIPPET.ts",
        `// Paste these entries into the GAMES array in src/lib/games.ts.
// Each game's files are already in public/games/<slug>/ and load via iframe.

${snippet}
`,
      );
      zip.file(
        "README.md",
        `# Custom Games Export

This ZIP contains every custom game currently stored in the database.

## How to bake them into the repo

1. Extract this ZIP into the **root of your project** (it will create/merge
   into \`public/games/<slug>/\`).
2. Open \`src/lib/games.ts\` and paste the entries from
   \`REGISTRY_SNIPPET.ts\` into the \`GAMES\` array. Remove any duplicates
   for slugs that already exist.
3. Commit the new files. From now on, any fork of the app ships with these
   games baked in — no database round-trip required.

Exported ${games.length} game(s), ${totalFiles} file(s) total.
`,
      );

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `custom-games-export-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description: `Packaged ${games.length} game(s) — ${totalFiles} file(s). See README.md inside the zip.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Export failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 font-display text-xl text-primary">Export games to public/</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Bundle every custom game (files + covers) into a ZIP that drops
        straight into <span className="font-mono text-primary">public/games/&lt;slug&gt;/</span>.
        Extract at the project root, paste the snippet into{" "}
        <span className="font-mono text-primary">src/lib/games.ts</span>, commit — and any
        fork of the app carries the games baked in.
      </p>
      <Button onClick={handleExport} disabled={busy}>
        {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
        {busy ? "Packaging..." : "Export games ZIP"}
      </Button>
    </div>
  );
};

export default ExportGamesAdmin;
