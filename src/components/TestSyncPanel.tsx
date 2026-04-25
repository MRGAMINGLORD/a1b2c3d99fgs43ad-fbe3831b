import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Loader2,
  Lock,
  GitMerge,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { downloadGameData, importGameData } from "@/lib/gameStorage";
import { isEditUnlocked, unlockEdit } from "@/lib/testAuth";
import { useTestGames } from "@/hooks/useTestGames";

interface Props {
  /** Called after a successful sync so the parent can refresh state if needed. */
  onSynced?: () => void;
}

const TestSyncPanel = ({ onSynced }: Props) => {
  const { rows, reload } = useTestGames();
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync flow state
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ---------- Save export / import ----------
  const handleExport = () => {
    try {
      const count = downloadGameData();
      toast({
        title:
          count > 0
            ? `Exported ${count} save entr${count === 1 ? "y" : "ies"}`
            : "Export complete",
        description:
          count > 0
            ? "Save file downloaded."
            : "No save data was found yet — start a game first.",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not write the save file.",
        variant: "destructive",
      });
    }
  };

  const handleImportClick = () => fileRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = importGameData(text);
      toast({
        title: `Imported ${result.imported} entr${result.imported === 1 ? "y" : "ies"}`,
        description:
          result.skipped > 0
            ? `${result.skipped} entries were skipped (reserved keys).`
            : "Reload a game to see your restored progress.",
      });
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // ---------- Sync to live ----------
  const startSync = () => {
    if (isEditUnlocked()) {
      setConfirmOpen(true);
    } else {
      setPw("");
      setPwErr(false);
      setPwOpen(true);
    }
  };

  const submitPw = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockEdit(pw)) {
      setPwOpen(false);
      setPw("");
      setPwErr(false);
      setConfirmOpen(true);
    } else {
      setPwErr(true);
      setPw("");
    }
  };

  const runSync = async () => {
    setConfirmOpen(false);
    setSyncing(true);
    // Re-fetch to make sure we ship the freshest test data
    await reload();
    const playable = rows.filter((r) => r.html.trim().length > 0);
    if (playable.length === 0) {
      setSyncing(false);
      toast({
        title: "Nothing to sync",
        description: "No TEST games have code yet.",
        variant: "destructive",
      });
      return;
    }

    const payload = playable.map((r) => ({
      slug: r.slug,
      title: r.title,
      description: r.description,
      cover_url: r.cover_url,
      html: r.html,
      category: r.category,
    }));

    const { error } = await supabase
      .from("custom_games")
      .upsert(payload, { onConflict: "slug" });

    setSyncing(false);
    if (error) {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Synced to main site",
      description: `${payload.length} game${payload.length === 1 ? "" : "s"} pushed to the live hub.`,
    });
    onSynced?.();
  };

  const playableCount = rows.filter((r) => r.html.trim().length > 0).length;

  return (
    <section className="mx-auto mt-10 max-w-5xl px-6">
      {/* Sync to main site */}
      <div className="mb-4 rounded-lg border-2 border-primary bg-gradient-to-br from-card via-card/80 to-primary/10 p-5 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)] border-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-lg uppercase tracking-wider text-primary">
              <GitMerge className="h-5 w-5" />
              Sync with main site
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Push <span className="text-primary">all</span> test games (code,
              covers, descriptions) straight to the live hub in one shot.
              Existing live games with the same slug are overwritten.
              <span className="ml-1 inline-flex items-center gap-1 rounded border border-primary/50 bg-primary/10 px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider text-primary">
                <Lock className="h-3 w-3" />
                password required
              </span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {playableCount} test game{playableCount === 1 ? "" : "s"} ready to
              sync.
            </p>
          </div>
          <Button onClick={startSync} disabled={syncing} size="lg">
            {syncing ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <GitMerge className="mr-1 h-4 w-4" />
            )}
            Sync with main site
          </Button>
        </div>
      </div>

      {/* Save export / import */}
      <div className="rounded-lg border border-primary/40 bg-card/60 p-5 border-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-lg uppercase tracking-wider text-primary">
              <Database className="h-5 w-5" />
              Export / Import save
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Download a single file containing your in-game progress for{" "}
              <span className="text-primary">every</span> game on the hub, or
              upload one to restore everything on this device.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              Export save
            </Button>
            <Button
              variant="outline"
              onClick={handleImportClick}
              className="gap-1"
            >
              <Upload className="h-4 w-4" />
              Import save
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>
      </div>

      {/* Password gate */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              Password required to sync to live
            </DialogTitle>
            <DialogDescription>
              Syncing will overwrite live games whose slugs match a test game.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitPw} className="space-y-3">
            <Input
              type="password"
              autoFocus
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={pwErr ? "border-destructive" : ""}
            />
            {pwErr && <p className="text-xs text-destructive">Wrong password.</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Unlock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm sync */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync everything to the live hub?</AlertDialogTitle>
            <AlertDialogDescription>
              This will push {playableCount} test game
              {playableCount === 1 ? "" : "s"} (code, covers, descriptions) to
              the public site, overwriting any live games with the same slug.
              Players will see the changes immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runSync}>
              Sync to live
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default TestSyncPanel;
