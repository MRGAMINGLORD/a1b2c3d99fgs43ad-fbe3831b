// Unified view of all games on the hub: the static built-in registry
// PLUS any admin-created custom games from the database. Use this hook
// (instead of importing GAMES directly) anywhere that needs to treat
// custom games as first-class — featured carousel, admin pickers, etc.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GAMES, type GameMeta } from "@/lib/games";
import type { CustomGameRow } from "@/hooks/useCustomGames";

const customRowToMeta = (row: CustomGameRow): GameMeta => ({
  id: row.slug,
  title: row.title,
  description: row.description,
  cover: row.cover_url || "/placeholder.svg",
  available: row.html.trim().length > 0,
  playUrl: `/play/${row.slug}`,
  category:
    row.category === "tycoon" || row.category === "twist"
      ? row.category
      : "other",
  credits: row.credits ?? "",
});

export const useAllGames = () => {
  const [games, setGames] = useState<GameMeta[]>(GAMES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("custom_games")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (!error && data) {
        const customMetas = (data as CustomGameRow[]).map(customRowToMeta);
        // Built-ins first so featured ordering is predictable when both exist.
        setGames([...GAMES, ...customMetas]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { games, loading };
};
