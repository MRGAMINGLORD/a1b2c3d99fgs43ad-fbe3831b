// Reads + subscribes to the global DEFCON level from the site_settings table.
// 0 = lockdown (admin only), 1 = password gate (WAFFLE),
// 2 = no testing page, 3 = feedback throttled (10min), 4 = normal.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitPasswordGateAttempt, type PasswordGateResult } from "@/lib/passwordGate";

export type DefconLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const DEFCON_LABELS: Record<DefconLevel, string> = {
  0: "0 — Stealth mode (looks unpublished)",
  1: "1 — Full lockdown (admin only)",
  2: "2 — Password gate + testing closed + feedback throttled",
  3: "3 — Testing closed + feedback throttled",
  4: "4 — Feedback throttled (10 min)",
  5: "5 — All systems normal",
};

const DEFCON_PASSWORD = "WAFFLE";
const GATE_KEY = "apocalypse-waffle:defcon1-unlocked";
const ATTEMPTS_KEY = "apocalypse-waffle:defcon-access:attempts";
const LOCKOUT_KEY = "apocalypse-waffle:defcon-access:lockout-until";

export const isDefconGateUnlocked = (): boolean => {
  try {
    return sessionStorage.getItem(GATE_KEY) === "1";
  } catch {
    return false;
  }
};

export const getDefconLockoutUntil = (): number => {
  try {
    const v = Number(localStorage.getItem(LOCKOUT_KEY) ?? "0");
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
};
export const isDefconLockedOut = (): boolean => getDefconLockoutUntil() > Date.now();
export const getDefconAttempts = (): number => {
  try {
    return Number(localStorage.getItem(ATTEMPTS_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
};
export const remainingDefconAttempts = (): number =>
  Math.max(0, 3 - getDefconAttempts());

export type UnlockResult =
  | { ok: true }
  | { ok: false; lockedOut: boolean; remaining: number; lockoutUntil: number };

export const unlockDefconGate = (input: string): UnlockResult => {
  const result = submitPasswordGateAttempt("defcon-access", input === DEFCON_PASSWORD);
  if (result.ok) {
    try {
      sessionStorage.setItem(GATE_KEY, "1");
    } catch {
      /* ignore */
    }
    return { ok: true };
  } else {
    const failed = result as Extract<PasswordGateResult, { ok: false }>;
    return {
      ok: false,
      lockedOut: failed.lockedOut,
      remaining: failed.remaining,
      lockoutUntil: failed.lockoutUntil,
    };
  }
};

export const useDefcon = () => {
  const [level, setLevel] = useState<DefconLevel>(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const channelId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const load = async () => {
      const { data } = await supabase
        .from("site_settings" as never)
        .select("defcon_level")
        .eq("id", "global")
        .maybeSingle();
      if (mounted && data) {
        setLevel(((data as { defcon_level: number }).defcon_level ?? 5) as DefconLevel);
      }
      if (mounted) setLoading(false);
    };
    load();

    const channel = supabase.channel(`site-settings-defcon-${channelId}`);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "site_settings" },
      (payload) => {
        const row = payload.new as { defcon_level?: number } | null;
        if (row && typeof row.defcon_level === "number") {
          setLevel(row.defcon_level as DefconLevel);
        }
      },
    );
    channel.subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { level, loading };
};
