import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CustomGameRow } from "@/hooks/useCustomGames";

// Same shape as live custom_games (mirror table).
export type TestGameRow = CustomGameRow;

export const useTestGames = () => {
  const [rows, setRows] = useState<TestGameRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("test_custom_games")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data as TestGameRow[]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  return { rows, loading, reload };
};

export const fetchTestGame = async (slug: string): Promise<TestGameRow | null> => {
  const { data, error } = await supabase
    .from("test_custom_games")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as TestGameRow;
};
