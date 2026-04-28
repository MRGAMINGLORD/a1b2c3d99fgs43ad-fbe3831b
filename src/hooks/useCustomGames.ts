import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GameMeta } from "@/lib/games";

export interface CustomGameRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_url: string | null;
  html: string;
  category: string;
  credits?: string;
  created_at: string;
  updated_at: string;
}

const toGameMeta = (row: CustomGameRow): GameMeta => ({
  id: row.slug,
  title: row.title,
  description: row.description,
  cover: row.cover_url || "/placeholder.svg",
  // `html` is either a URL to a stored file or inline HTML. Either way,
  // a non-empty value means the game is playable.
  available: row.html.trim().length > 0,
  playUrl: `/play/${row.slug}`,
  category:
    row.category === "tycoon" || row.category === "twist"
      ? row.category
      : "other",
});

export const useCustomGames = () => {
  const [games, setGames] = useState<GameMeta[]>([]);
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
        setGames((data as CustomGameRow[]).map(toGameMeta));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { games, loading };
};

// One-off lookup used by the play route. Returns the raw HTML so we can
// render the user-supplied game inside the iframe via a blob URL.
export const fetchCustomGame = async (
  slug: string,
): Promise<CustomGameRow | null> => {
  const { data, error } = await supabase
    .from("custom_games")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as CustomGameRow;
};
