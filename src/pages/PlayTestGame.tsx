import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { fetchTestGame } from "@/hooks/useTestGames";
import { isTestUnlocked } from "@/lib/testAuth";

const PlayTestGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [src, setSrc] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const blobRef = useMemo(() => ({ current: null as string | null }), []);

  useEffect(() => {
    let active = true;
    if (!gameId) return;
    (async () => {
      const row = await fetchTestGame(gameId);
      if (!active) return;
      if (!row || !row.html.trim()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const blob = new Blob([row.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      blobRef.current = url;
      setSrc(url);
      setTitle(row.title);
      setLoading(false);
    })();
    return () => {
      active = false;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [gameId, blobRef]);

  // Test play is gated behind the same TEST password
  if (!isTestUnlocked()) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background">
        <AlertTriangle className="h-10 w-10 text-primary" />
        <p className="font-display text-sm uppercase tracking-wider text-primary">Test mode locked</p>
        <Link
          to="/test"
          className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 font-display text-xs uppercase text-primary-foreground hover:bg-primary/80"
        >
          Unlock Test Mode
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="font-display text-sm uppercase tracking-wider text-primary">Loading test game...</p>
      </div>
    );
  }

  if (notFound || !src) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-background">
        <AlertTriangle className="h-10 w-10 text-primary" />
        <p className="font-display text-sm uppercase tracking-wider text-primary">Test game not found</p>
        <Link
          to="/test"
          className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-3 py-2 font-display text-xs uppercase text-primary-foreground hover:bg-primary/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to test
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background p-2 sm:p-3">
      {/* Test mode banner */}
      <div className="absolute left-1/2 top-2 z-50 -translate-x-1/2 rounded-md border border-destructive bg-destructive/20 px-3 py-1 font-display text-[10px] uppercase tracking-widest text-destructive">
        ⚠ Test build — not the live game
      </div>
      <div className="absolute left-4 top-4 z-50 flex items-center gap-2">
        <Link
          to="/test"
          className="flex items-center gap-2 rounded-md border border-primary/60 bg-background/80 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to test
        </Link>
        <Link
          to="/"
          aria-label="Exit to hub"
          className="flex items-center gap-2 rounded-md border border-primary/60 bg-background/80 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          Exit to hub
        </Link>
      </div>
      <div className="relative h-full w-full overflow-hidden rounded-md border border-primary/50 bg-card border-glow">
        <iframe
          src={src}
          title={title}
          className="h-full w-full border-0 bg-background"
          allow="fullscreen; autoplay; gamepad"
        />
      </div>
    </div>
  );
};

export default PlayTestGame;
