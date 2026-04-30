// Reads + subscribes to the global DEFCON level from the site_settings table.
// 0 = lockdown (admin only), 1 = password gate (WAFFLE),
// 2 = no testing page, 3 = feedback throttled (10min), 4 = normal.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DefconLevel = 0 | 1 | 2 | 3 | 4;

export const DEFCON_LABELS: Record<DefconLevel, string> = {
  0: "0 — Lockdown (admin only)",
  1: "1 — Password gate (WAFFLE)",
  2: "2 — Tester area closed",
  3: "3 — Feedback throttled",
  4: "4 — All systems normal",
};

const DEFCON_PASSWORD = "WAFFLE";
const GATE_KEY = "apocalypse-waffle:defcon1-unlocked";

export const isDefconGateUnlocked = (): boolean => {
  try {
    return sessionStorage.getItem(GATE_KEY) === "1";
  } catch {
    return false;
  }
};
export const unlockDefconGate = (input: string): boolean => {
  if (input === DEFCON_PASSWORD) {
    try {
      sessionStorage.setItem(GATE_KEY, "1");
    } catch {}
    return true;
  }
  return false;
};

export const useDefcon = () => {
  const [level, setLevel] = useState<DefconLevel>(4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("site_settings" as never)
        .select("defcon_level")
        .eq("id", "global")
        .maybeSingle();
      if (mounted && data) {
        setLevel(((data as { defcon_level: number }).defcon_level ?? 4) as DefconLevel);
      }
      if (mounted) setLoading(false);
    };
    load();

    const channel = supabase
      .channel("site-settings-defcon")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          const row = payload.new as { defcon_level?: number } | null;
          if (row && typeof row.defcon_level === "number") {
            setLevel(row.defcon_level as DefconLevel);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { level, loading };
};
