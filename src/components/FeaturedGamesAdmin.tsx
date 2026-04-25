import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { GAMES } from "@/lib/games";

interface FeaturedRow {
  id: string;
  game_id: string;
  position: number;
}

const FeaturedGamesAdmin = () => {
  const [rows, setRows] = useState<FeaturedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("featured_games")
      .select("id, game_id, position")
      .order("position", { ascending: true });
    if (error) {
      toast({ title: "Error loading featured", description: error.message, variant: "destructive" });
    } else {
      setRows((data ?? []) as FeaturedRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const featuredIds = new Set(rows.map((r) => r.game_id));

  const addFeatured = async (gameId: string) => {
    const nextPos = rows.length;
    const { error } = await supabase
      .from("featured_games")
      .insert({ game_id: gameId, position: nextPos });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const removeFeatured = async (id: string) => {
    const { error } = await supabase.from("featured_games").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl text-primary">Featured Games</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Pick which games appear in the Featured Games carousel on the home page.
      </p>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {rows.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="font-display text-sm uppercase tracking-wider text-primary">
                Currently Featured ({rows.length})
              </h3>
              {rows.map((r) => {
                const game = GAMES.find((g) => g.id === r.game_id);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-md border border-primary/40 bg-background/40 p-3"
                  >
                    <span className="font-display text-sm text-primary">
                      {game?.title ?? r.game_id}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFeatured(r.id)}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          <h3 className="mb-2 font-display text-sm uppercase tracking-wider text-muted-foreground">
            Add Game
          </h3>
          <div className="flex flex-wrap gap-2">
            {GAMES.filter((g) => !featuredIds.has(g.id)).map((g) => (
              <Button
                key={g.id}
                variant="outline"
                size="sm"
                onClick={() => addFeatured(g.id)}
              >
                + {g.title}
              </Button>
            ))}
            {GAMES.every((g) => featuredIds.has(g.id)) && (
              <p className="text-sm text-muted-foreground">
                All games are already featured.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FeaturedGamesAdmin;
