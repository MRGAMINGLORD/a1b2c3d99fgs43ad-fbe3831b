import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Download, Upload, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { toast } from "sonner";
import {
  downloadGameData,
  getLastGame,
  getSaveMeta,
  hasAnySave,
  importGameData,
} from "@/lib/gameStorage";
import { getGame } from "@/lib/games";

const formatRelative = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) {
    const m = Math.floor(diff / 60_000);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diff < 86_400_000) {
    const h = Math.floor(diff / 3_600_000);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diff / 86_400_000);
  return `${d} day${d === 1 ? "" : "s"} ago`;
};

const SaveDataPanel = () => {
  const [lastGame, setLastGameState] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setLastGameState(getLastGame());
    const meta = getSaveMeta();
    const allTimes = Object.values(meta).map((v) => v.savedAt);
    setLastSavedAt(allTimes.length ? Math.max(...allTimes) : null);
    setHasSave(hasAnySave());
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 5000);
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const handleExport = () => {
    try {
      const count = downloadGameData();
      toast.success(
        count > 0
          ? `Exported ${count} save entr${count === 1 ? "y" : "ies"}.`
          : "Export complete (no save data found yet).",
      );
    } catch {
      toast.error("Could not export save data.");
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = importGameData(text);
      toast.success(
        `Imported ${result.imported} entr${result.imported === 1 ? "y" : "ies"}. Reload a game to see your progress.`,
      );
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const handleSaveNow = () => {
    // Tell any open game tabs/iframes to save immediately, then refresh status.
    try {
      const bc = new BroadcastChannel("apocalypse-waffle");
      bc.postMessage({ type: "save-now" });
      bc.close();
    } catch {
      // BroadcastChannel unavailable — that's fine, hub still re-reads localStorage below.
    }
    // Give the games a moment to write, then refresh the panel.
    window.setTimeout(() => {
      refresh();
      const saved = hasAnySave();
      if (saved) toast.success("Save committed to bunker storage.");
      else toast.message("Nothing to save yet — start a game first.");
    }, 250);
  };

  const lastTitle = lastGame ? getGame(lastGame)?.title ?? null : null;

  return (
    <section className="mx-auto max-w-5xl px-6 pb-2 pt-6">
      <div className="rounded-lg border border-primary/40 bg-card/60 p-5 border-glow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-display text-lg uppercase tracking-wider text-primary">
              Bunker Save Terminal
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {lastTitle
                ? `Last deployment: ${lastTitle}.`
                : "No previous deployments logged."}{" "}
              Use <span className="text-primary">Export save</span> to back up your progress to a file, and{" "}
              <span className="text-primary">Import save</span> to restore it on this or another device.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 font-display text-[10px] uppercase tracking-wider">
              <span
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 ${
                  hasSave
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-destructive/60 bg-destructive/10 text-destructive"
                }`}
              >
                {hasSave ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {hasSave ? "Saved" : "Not saved"}
              </span>
              <span className="rounded-sm border border-primary/40 bg-background/40 px-2 py-1 text-muted-foreground">
                Last saved:{" "}
                <span className="text-primary">
                  {lastSavedAt ? formatRelative(lastSavedAt) : "never"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {lastGame && lastTitle && (
              <Link
                to={`/play/${lastGame}`}
                className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 font-display text-xs uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/80"
              >
                <Play className="h-4 w-4" />
                Play {lastTitle} again
              </Link>
            )}
            <button
              onClick={handleSaveNow}
              className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-background/40 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Save className="h-4 w-4" />
              Save Now
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-background/40 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              Export save
            </button>
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-background/40 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Upload className="h-4 w-4" />
              Import save
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SaveDataPanel;
