import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Sparkles, Gamepad2 } from "lucide-react";
import { useAllGames } from "@/hooks/useAllGames";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatchNote {
  id: string;
  version: string | null;
  title: string;
  content: string;
  game_id: string | null;
  created_at: string;
}

const ALL = "__all__";
const SITE = "__site__";

const PatchNotes = () => {
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [filter, setFilter] = useState<string>(ALL);
  const { games } = useAllGames();

  useEffect(() => {
    supabase
      .from("patch_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setNotes(data as PatchNote[]);
      });
  }, []);

  const gameLabel = (id: string | null): string =>
    !id ? "Site-wide" : games.find((g) => g.id === id)?.title ?? id;

  const filtered = useMemo(() => {
    if (filter === ALL) return notes;
    if (filter === SITE) return notes.filter((n) => !n.game_id);
    return notes.filter((n) => n.game_id === filter);
  }, [notes, filter]);

  if (notes.length === 0) return null;

  // Game IDs that actually appear in notes (so the filter only lists relevant ones)
  const gameIdsInNotes = Array.from(
    new Set(notes.map((n) => n.game_id).filter((x): x is string => !!x)),
  );

  const latest = filtered[0];
  const older = filtered.slice(1);

  return (
    <section className="mx-auto max-w-5xl px-6 pb-8 pt-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="patch-notes"
          className="rounded-lg border border-primary/40 bg-card/40 px-4 border-glow"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex w-full items-center justify-center gap-3">
              <ScrollText className="h-6 w-6 text-primary" />
              <span className="font-display text-2xl uppercase tracking-wider text-primary sm:text-3xl">
                Patch Notes
              </span>
              <span className="rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                {notes.length}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {/* Filter */}
            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              <span className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
                Filter by game
              </span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All patches</SelectItem>
                  <SelectItem value={SITE}>Site-wide only</SelectItem>
                  {gameIdsInNotes.map((gid) => (
                    <SelectItem key={gid} value={gid}>
                      {gameLabel(gid)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No patches match this filter.
              </p>
            ) : (
              <>
                {/* Latest (within filter) — prominent hero card */}
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
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
};

export default PatchNotes;
