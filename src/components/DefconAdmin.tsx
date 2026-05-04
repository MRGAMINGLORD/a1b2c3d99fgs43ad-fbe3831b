// Admin control for the global DEFCON level.
// Updates the singleton row in site_settings so the change propagates
// to every connected client via realtime.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ShieldAlert, Loader2 } from "lucide-react";
import { DEFCON_LABELS, type DefconLevel } from "@/hooks/useDefcon";

const LEVEL_DESCRIPTIONS: Record<DefconLevel, string> = {
  0: "Total lockdown — only /admin and /login load. Everyone else is locked out.",
  1: "Password gate — visitors must enter the passphrase WAFFLE (case sensitive) to enter.",
  2: "Tester area is closed. Everything else is normal.",
  3: "Feedback can only be sent once every 10 minutes per visitor.",
  4: "Normal operations. No restrictions.",
};

const DefconAdmin = () => {
  const [level, setLevel] = useState<DefconLevel>(4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<DefconLevel | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings" as never)
        .select("defcon_level")
        .eq("id", "global")
        .maybeSingle();
      if (data) setLevel(((data as { defcon_level: number }).defcon_level ?? 4) as DefconLevel);
      setLoading(false);
    };
    load();
  }, []);

  const setDefcon = async (next: DefconLevel) => {
    setSaving(next);
    const { error } = await supabase
      .from("site_settings" as never)
      .upsert({ id: "global", defcon_level: next, updated_at: new Date().toISOString() } as never);
    setSaving(null);
    if (error) {
      toast({ title: "Could not update DEFCON", description: error.message, variant: "destructive" });
      return;
    }
    setLevel(next);
    toast({ title: `DEFCON ${next} engaged`, description: LEVEL_DESCRIPTIONS[next] });
  };

  return (
    <div className="mb-10 rounded-lg border-2 border-foreground/60 bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-foreground" />
        <h2 className="font-display text-xl text-foreground">DEFCON Control</h2>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Current level:{" "}
            <span className="font-display text-primary">{DEFCON_LABELS[level]}</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {([0, 1, 2, 3, 4] as DefconLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDefcon(lvl)}
                disabled={saving !== null}
                className={`rounded-lg border-2 p-3 text-left transition disabled:opacity-50 ${
                  level === lvl
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/60"
                }`}
              >
                <div className="font-display text-sm uppercase tracking-wider text-primary">
                  {DEFCON_LABELS[lvl]}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {LEVEL_DESCRIPTIONS[lvl]}
                </div>
                {saving === lvl && (
                  <Loader2 className="mt-2 h-3 w-3 animate-spin text-primary" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DefconAdmin;
