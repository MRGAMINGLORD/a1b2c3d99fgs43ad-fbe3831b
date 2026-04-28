// Admin "Game Profiles" picker — choose any game (built-in OR custom)
// from a dropdown to view its full profile (cover, description, location,
// credits, etc.) without opening the editor.

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GameProfileDialog from "@/components/GameProfileDialog";
import { GAMES } from "@/lib/games";
import { useCustomGames } from "@/hooks/useCustomGames";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import type { CustomGameRow } from "@/hooks/useCustomGames";

const GameProfilesAdmin = () => {
  const [selected, setSelected] = useState<string>("");
  const [open, setOpen] = useState<string | null>(null);
  const [customs, setCustoms] = useState<CustomGameRow[]>([]);

  // Pull the same custom rows shape the editor uses, so the dialog can
  // resolve `custom:<id>` keys directly.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("custom_games")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (data) setCustoms(data as CustomGameRow[]);
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="mb-10 rounded-lg border border-border bg-card p-6">
      <h2 className="mb-1 font-display text-xl text-primary">Game Profiles</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Pick any game to inspect its cover, description, location, and credits.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a game..." />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1 font-display text-[10px] uppercase tracking-wider text-muted-foreground">
              Built-in
            </div>
            {GAMES.map((g) => (
              <SelectItem key={`b-${g.id}`} value={`builtin:${g.id}`}>
                {g.title}
              </SelectItem>
            ))}
            {customs.length > 0 && (
              <div className="mt-1 px-2 py-1 font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                Custom
              </div>
            )}
            {customs.map((r) => (
              <SelectItem key={`c-${r.id}`} value={`custom:${r.id}`}>
                {r.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={!selected}
          onClick={() => setOpen(selected)}
        >
          <Eye className="mr-1 h-4 w-4" />
          View profile
        </Button>
      </div>

      <GameProfileDialog
        gameKey={open}
        customGames={customs}
        onClose={() => setOpen(null)}
      />
    </div>
  );
};

export default GameProfilesAdmin;
