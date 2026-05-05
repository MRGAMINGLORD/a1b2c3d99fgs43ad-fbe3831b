// Unified view of all games on the hub: the static built-in registry
// PLUS any admin-created custom games from the database. Built-in games
// can also have admin-edited overrides (title/description/credits/etc.)
// stored in the `game_overrides` table — those are merged on top of the
// static metadata so admin edits show up everywhere `useAllGames` is used.

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

// When a custom_games row shares a slug with a built-in game (e.g. the tester
// pushed code for "waffle-works"), merge the custom row ON TOP of the built-in
// instead of replacing it. This preserves the bundled cover image and any
// other built-in metadata when the tester row left those fields empty.
const mergeCustomOntoBuiltin = (builtin: GameMeta, row: CustomGameRow): GameMeta => ({
  ...builtin,
  title: row.title?.trim() ? row.title : builtin.title,
  description: row.description?.trim() ? row.description : builtin.description,
  cover: row.cover_url?.trim() ? row.cover_url : builtin.cover,
  available: row.html.trim().length > 0 ? true : builtin.available,
  playUrl: `/play/${row.slug}`,
  category:
    row.category === "tycoon" || row.category === "twist" || row.category === "other"
      ? row.category
      : builtin.category,
  credits: row.credits?.trim() ? row.credits : builtin.credits,
});

export interface GameOverrideRow {
  id: string;
  game_id: string;
  title: string | null;
  description: string | null;
  credits: string | null;
  category: string | null;
  cover_url: string | null;
}

const applyOverride = (g: GameMeta, o: GameOverrideRow | undefined): GameMeta => {
  if (!o) return g;
  const cat = o.category;
  return {
    ...g,
    title: o.title?.trim() ? o.title : g.title,
    description: o.description?.trim() ? o.description : g.description,
    credits: o.credits ?? g.credits,
    cover: o.cover_url?.trim() ? o.cover_url : g.cover,
    category:
      cat === "tycoon" || cat === "twist" || cat === "other" || cat === "education"
        ? cat
        : g.category,
  };
};

export const useAllGames = () => {
  const [games, setGames] = useState<GameMeta[]>(GAMES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [customRes, overrideRes] = await Promise.all([
        supabase.from("custom_games").select("*").order("created_at", { ascending: false }),
        // game_overrides isn't in generated types yet — cast to bypass.
        (supabase.from as unknown as (t: string) => { select: (q: string) => Promise<{ data: GameOverrideRow[] | null; error: unknown }> })("game_overrides").select("*"),
      ]);
      if (!active) return;
      const overrides = (overrideRes.data ?? []) as GameOverrideRow[];
      const overrideMap = new Map(overrides.map((o) => [o.game_id, o]));
      
      const customRows = !customRes.error && customRes.data
        ? (customRes.data as CustomGameRow[])
        : [];
      const builtinSlugs = new Set(GAMES.map((g) => g.id));
      const customBySlug = new Map(customRows.map((r) => [r.slug, r]));

      // Built-ins: apply override + merge any custom row that shares the slug.
      const builtinsMerged = GAMES.map((g) => {
        const withOverride = applyOverride(g, overrideMap.get(g.id));
        const matchingCustom = customBySlug.get(g.id);
        return matchingCustom ? mergeCustomOntoBuiltin(withOverride, matchingCustom) : withOverride;
      });

      // Only show standalone custom games whose slug doesn't collide with a built-in.
      const standaloneCustom = customRows
        .filter((r) => !builtinSlugs.has(r.slug))
        .map(customRowToMeta);

      setGames([...builtinsMerged, ...standaloneCustom]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { games, loading };
};
