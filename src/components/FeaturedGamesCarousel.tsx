import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, getGame } from "@/lib/games";

interface FeaturedGameRow {
  game_id: string;
  position: number;
}

const FeaturedGamesCarousel = () => {
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("featured_games")
        .select("game_id, position")
        .order("position", { ascending: true });
      if (!active) return;
      if (!error && data) {
        setFeaturedIds((data as FeaturedGameRow[]).map((r) => r.game_id));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Only show games that exist in our registry
  const games = featuredIds
    .map((id) => getGame(id))
    .filter((g): g is (typeof GAMES)[number] => Boolean(g));

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-6 pt-6">
        <h2 className="mb-3 font-display text-2xl uppercase tracking-wider text-primary text-glow sm:text-3xl">
          ★ Featured Games
        </h2>
        <div className="h-32 animate-pulse rounded-lg border border-primary/30 bg-card/40" />
      </section>
    );
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pt-6">
      <div className="mb-3 flex items-center gap-2">
        <Star className="h-5 w-5 fill-primary text-primary" />
        <h2 className="font-display text-2xl uppercase tracking-wider text-primary text-glow sm:text-3xl">
          Featured Games
        </h2>
      </div>
      <div className="rounded-lg border border-primary/40 bg-card/60 p-3 border-glow">
        <div className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {games.map((g) => {
            const card = (
              <div
                className={`group relative w-44 shrink-0 overflow-hidden rounded-md border text-left transition-transform duration-300 ${
                  g.available
                    ? "border-primary/50 bg-card hover:scale-[1.04] hover:border-primary"
                    : "border-border bg-card/50 opacity-60"
                }`}
              >
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-muted">
                  <img
                    src={g.cover}
                    alt={`${g.title} cover art`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                  {!g.available && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        <span className="font-display text-[10px] uppercase tracking-wider">
                          Soon
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="truncate font-display text-xs uppercase tracking-wide text-primary">
                    {g.title}
                  </h3>
                  {g.available && (
                    <span className="font-display text-[10px] uppercase tracking-wider text-primary">
                      ▶ Play
                    </span>
                  )}
                </div>
              </div>
            );
            return g.available && g.playUrl ? (
              <Link key={g.id} to={g.playUrl} className="shrink-0">
                {card}
              </Link>
            ) : (
              <div key={g.id}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedGamesCarousel;
