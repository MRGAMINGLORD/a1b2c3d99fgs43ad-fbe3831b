import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Sparkles, Gamepad2 } from "lucide-react";
import { useAllGames } from "@/hooks/useAllGames";

interface PatchNote {
  id: string;
  version: string | null;
  title: string;
  content: string;
  game_id: string | null;
  created_at: string;
}

const PatchNotes = () => {
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const { games } = useAllGames();

  useEffect(() => {
    supabase
      .from("patch_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setNotes(data as PatchNote[]);
      });
  }, []);

  if (notes.length === 0) return null;

  const gameLabel = (id: string | null): string =>
    !id ? "Site-wide" : games.find((g) => g.id === id)?.title ?? id;

  const [latest, ...older] = notes;

  return (
    <section className="mx-auto max-w-5xl px-6 pb-8 pt-4">
      <h2 className="mb-6 text-center font-display text-3xl text-primary sm:text-4xl">
        <ScrollText className="mx-auto mb-2 h-8 w-8" />
        Patch Notes
      </h2>

      {/* Latest patch — prominent hero card */}
      <div className="relative mb-6 overflow-hidden rounded-lg border-2 border-primary bg-gradient-to-br from-card via-card/80 to-primary/10 p-6 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)] border-glow">
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-primary/60 bg-background/70 px-2 py-0.5 font-display text-[10px] uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          Latest
        </div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded border border-primary/60 bg-primary/10 px-2 py-0.5 font-display text-[11px] uppercase tracking-wider text-primary">
          <Gamepad2 className="h-3 w-3" />
          {gameLabel(latest.game_id)}
        </div>
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          {latest.version && (
            <span className="rounded-md border border-destructive/60 bg-destructive/10 px-2 py-1 font-mono text-base font-bold text-destructive">
              v{latest.version}
            </span>
          )}
          <h3 className="font-display text-2xl uppercase tracking-wider text-primary text-glow sm:text-3xl">
            {latest.title}
          </h3>
        </div>
        <p className="whitespace-pre-wrap text-sm text-card-foreground sm:text-base">
          {latest.content}
        </p>
        <span className="mt-3 block text-xs text-muted-foreground">
          {new Date(latest.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Older patches */}
      {older.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            Previous patches
          </h3>
          {older.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-primary/40 bg-card/60 p-4"
            >
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider text-primary">
                    <Gamepad2 className="h-3 w-3" />
                    {gameLabel(n.game_id)}
                  </span>
                  <h4 className="font-display text-lg uppercase tracking-wider text-primary">
                    {n.title}
                  </h4>
                </div>
                {n.version && (
                  <span className="rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 font-mono text-xs font-bold text-destructive">
                    v{n.version}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-card-foreground">
                {n.content}
              </p>
              <span className="mt-2 block text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PatchNotes;
