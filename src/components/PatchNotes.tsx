import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText } from "lucide-react";

interface PatchNote {
  id: string;
  version: string | null;
  title: string;
  content: string;
  created_at: string;
}

const PatchNotes = () => {
  const [notes, setNotes] = useState<PatchNote[]>([]);

  useEffect(() => {
    supabase
      .from("patch_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setNotes(data);
      });
  }, []);

  if (notes.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-6 pb-8 pt-4">
      <h2 className="mb-6 text-center font-display text-3xl text-primary sm:text-4xl">
        <ScrollText className="mx-auto mb-2 h-8 w-8" />
        Patch Notes
      </h2>
      <div className="space-y-4">
        {notes.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-primary/40 bg-card/60 p-4 border-glow"
          >
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg uppercase tracking-wider text-primary">
                {n.title}
              </h3>
              {n.version && (
                <span className="font-mono text-xs text-destructive">
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
    </section>
  );
};

export default PatchNotes;
