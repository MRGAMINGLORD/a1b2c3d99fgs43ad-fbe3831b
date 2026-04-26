import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { setLastGame } from "@/lib/gameStorage";
import { fetchCustomGame } from "@/hooks/useCustomGames";

type GameId = "turtle-trade-co" | "defense-of-belgium" | "waffle-craft" | "neon-snake";

const GAMES: Record<GameId, { src: string; title: string; loadingFlavor: string }> = {
  "turtle-trade-co": {
    src: "/games/turtle-trade-co/index.html",
    title: "Turtle Trade Co",
    loadingFlavor: "Sailing to the island...",
  },
  "defense-of-belgium": {
    src: "/games/defense-of-belgium/index.html",
    title: "Defense of Belgium",
    loadingFlavor: "Rolling tanks across the plains...",
  },
  "waffle-craft": {
    src: "/games/waffle-craft/index.html",
    title: "Waffle Craft",
    loadingFlavor: "Riding the minecart into the mines...",
  },
  "neon-snake": {
    src: "/games/neon-snake/index.html",
    title: "Neon Snake",
    loadingFlavor: "Booting the neon grid...",
  },
};

// Show the loading screen only if the iframe takes longer than this to load.
const LOADING_DELAY_MS = 600;

const TurtleLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden">
    {/* Sky */}
    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-primary/5" />
    {/* Sun */}
    <div className="absolute right-6 top-4 h-8 w-8 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />
    {/* Island in distance */}
    <div className="absolute right-2 top-20 h-6 w-16 rounded-t-full bg-primary/40" />
    {/* Water */}
    <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
      <div className="absolute inset-0 bg-primary/20" />
      <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-primary/40" />
      <div className="absolute inset-x-0 top-3 h-px bg-primary/30" />
      <div className="absolute inset-x-0 top-6 h-px bg-primary/20" />
    </div>
    {/* Boat */}
    <div className="absolute bottom-10 left-4 animate-[boat_2.4s_ease-in-out_infinite]">
      <div className="relative">
        {/* Sail */}
        <div className="ml-6 h-8 w-1 bg-primary" />
        <div className="absolute left-7 top-0 h-0 w-0 border-b-[24px] border-l-[18px] border-b-transparent border-l-primary" />
        {/* Hull */}
        <div className="mt-1 h-3 w-16 rounded-b-full bg-primary" />
        {/* Person */}
        <div className="absolute -top-2 left-3 h-2 w-2 rounded-full bg-primary-foreground" />
      </div>
    </div>
    <style>{`
      @keyframes boat {
        0%, 100% { transform: translate(0, 0) rotate(-2deg); }
        50% { transform: translate(8px, -3px) rotate(2deg); }
      }
    `}</style>
  </div>
);

const TanksLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden">
    {/* Sky */}
    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
    {/* Distant hills */}
    <div className="absolute bottom-12 left-0 right-0 h-10 bg-primary/10" />
    <div className="absolute bottom-12 left-10 h-6 w-20 rounded-t-full bg-primary/15" />
    <div className="absolute bottom-12 right-8 h-8 w-24 rounded-t-full bg-primary/15" />
    {/* Ground */}
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-primary/20" />
    {/* Tank treads dust */}
    <div className="absolute bottom-3 left-0 right-0 h-1 animate-pulse bg-primary/30" />
    {/* Tanks moving */}
    <div className="absolute bottom-8 left-0 animate-[tanks_3s_linear_infinite]">
      <div className="flex items-end gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative">
            {/* Turret */}
            <div className="ml-2 h-2 w-4 bg-primary" />
            {/* Barrel */}
            <div className="absolute left-6 top-0 h-1 w-4 bg-primary" />
            {/* Body */}
            <div className="h-3 w-8 bg-primary" />
            {/* Treads */}
            <div className="h-1 w-9 -translate-x-px rounded-full bg-primary/60" />
          </div>
        ))}
      </div>
    </div>
    <style>{`
      @keyframes tanks {
        0% { transform: translateX(-40%); }
        100% { transform: translateX(110%); }
      }
    `}</style>
  </div>
);

const MinecartLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden">
    {/* Cave background */}
    <div className="absolute inset-0 bg-gradient-to-b from-background to-primary/10" />
    {/* Cave ceiling pixels */}
    <div className="absolute left-0 right-0 top-0 flex h-4 gap-px">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="flex-1 bg-primary/20" style={{ height: `${4 + (i % 3) * 4}px` }} />
      ))}
    </div>
    {/* Track */}
    <div className="absolute bottom-8 left-0 right-0 h-1 bg-primary/60" />
    {/* Track ties */}
    <div className="absolute bottom-6 left-0 right-0 flex justify-between px-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-2 w-1 bg-primary/40" />
      ))}
    </div>
    {/* Minecart with figure */}
    <div className="absolute bottom-9 left-0 animate-[cart_2.5s_linear_infinite]">
      <div className="relative">
        {/* Pixel figure (head + body) */}
        <div className="absolute -top-6 left-3 h-2 w-2 bg-primary" />
        <div className="absolute -top-4 left-2 h-3 w-4 bg-primary" />
        {/* Cart body */}
        <div className="h-4 w-10 bg-primary" />
        <div className="absolute inset-x-1 top-1 h-2 bg-background/40" />
        {/* Wheels */}
        <div className="absolute -bottom-1 left-0 h-2 w-2 rounded-full bg-primary" />
        <div className="absolute -bottom-1 right-0 h-2 w-2 rounded-full bg-primary" />
      </div>
    </div>
    <style>{`
      @keyframes cart {
        0% { transform: translateX(-20%); }
        100% { transform: translateX(120%); }
      }
    `}</style>
  </div>
);

const NeonSnakeLoader = () => {
  // 8 segments worth of glowing snake; staggered pulse + travel along the grid.
  const segments = Array.from({ length: 8 });
  return (
    <div className="relative h-40 w-72 overflow-hidden bg-background">
      {/* Neon grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.35) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-radial-fade" style={{
        background: "radial-gradient(ellipse at center, transparent 0%, hsl(var(--background)) 95%)",
      }} />

      {/* Snake — 8 glowing squares chasing each other on a winding S-path */}
      <div className="absolute inset-0">
        {segments.map((_, i) => (
          <div
            key={i}
            className="absolute h-3 w-3 rounded-sm"
            style={{
              top: "50%",
              left: "0%",
              backgroundColor: "hsl(var(--primary))",
              boxShadow:
                "0 0 6px hsl(var(--primary)), 0 0 14px hsl(var(--primary) / 0.7), 0 0 24px hsl(var(--primary) / 0.4)",
              animation: `snake 2.4s linear infinite`,
              animationDelay: `${i * -0.12}s`,
              opacity: 1 - i * 0.08,
            }}
          />
        ))}
      </div>

      {/* Apple — pulsing target */}
      <div
        className="absolute h-3 w-3 rounded-sm"
        style={{
          top: "30%",
          left: "78%",
          backgroundColor: "hsl(var(--destructive))",
          boxShadow:
            "0 0 6px hsl(var(--destructive)), 0 0 16px hsl(var(--destructive) / 0.7)",
          animation: "apple-pulse 1.2s ease-in-out infinite",
        }}
      />

      <style>{`
        @keyframes snake {
          0%   { top: 70%; left: -10%; }
          25%  { top: 30%; left: 28%; }
          50%  { top: 70%; left: 50%; }
          75%  { top: 30%; left: 78%; }
          100% { top: 70%; left: 110%; }
        }
        @keyframes apple-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.4); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

const LOADERS: Partial<Record<GameId, () => JSX.Element>> = {
  "turtle-trade-co": TurtleLoader,
  "defense-of-belgium": TanksLoader,
  "waffle-craft": MinecartLoader,
  "neon-snake": NeonSnakeLoader,
};

const BackButton = () => {
  return (
    <ConfirmExitLink
      to="/"
      ariaLabel="Back to hub"
      title="Leave the game?"
      description="Your in-game progress may not be saved. Are you sure you want to head back to the hub?"
      confirmLabel="Yes, exit"
      cancelLabel="Keep playing"
      className="absolute left-4 top-4 z-50 flex items-center gap-2 rounded-md border border-primary/60 bg-background/80 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to hub
    </ConfirmExitLink>
  );
};

const GameNotFound = ({ gameId }: { gameId?: string }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-background px-6 text-center">
    <BackButton />
    <AlertTriangle className="mb-4 h-16 w-16 text-primary" />
    <h1 className="mb-3 font-display text-4xl uppercase tracking-wider text-primary text-glow sm:text-5xl">
      Game Not Found
    </h1>
    <p className="mb-2 max-w-md text-base text-foreground">
      We couldn't find a game called{" "}
      <span className="font-mono text-primary">"{gameId ?? "unknown"}"</span> in the bunker.
    </p>
    <p className="mb-8 max-w-md text-sm text-muted-foreground">
      It may have been lost to the apocalypse, or the link is broken. Head back to the hub to pick another game.
    </p>
    <Link
      to="/"
      className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 font-display text-sm uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/80"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to hub
    </Link>
  </div>
);

interface ResolvedGame {
  src: string;
  title: string;
  loadingFlavor: string;
  isCustom: boolean;
}

const PlayGame = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const builtIn = gameId && (gameId in GAMES) ? GAMES[gameId as GameId] : undefined;

  const [resolved, setResolved] = useState<ResolvedGame | null>(
    builtIn ? { ...builtIn, isCustom: false } : null,
  );
  const [resolving, setResolving] = useState(!builtIn);
  const [notFound, setNotFound] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const blobUrlRef = useMemo(() => ({ current: null as string | null }), []);

  useEffect(() => {
    let active = true;
    if (builtIn || !gameId) return;
    setResolving(true);
    setNotFound(false);
    (async () => {
      const row = await fetchCustomGame(gameId);
      if (!active) return;
      if (!row || !row.html.trim()) {
        setNotFound(true);
        setResolving(false);
        return;
      }
      // New behavior: `html` is a URL to a real file in the game-files
      // Storage bucket — load it directly, exactly like a built-in game.
      // Legacy fallback: if it's still raw HTML, render via a Blob URL.
      const isUrl = /^https?:\/\//i.test(row.html.trim());
      let src: string;
      if (isUrl) {
        src = row.html.trim();
      } else {
        const blob = new Blob([row.html], { type: "text/html" });
        src = URL.createObjectURL(blob);
        blobUrlRef.current = src;
      }
      setResolved({
        src,
        title: row.title,
        loadingFlavor: "Loading custom game...",
        isCustom: true,
      });
      setResolving(false);
    })();
    return () => {
      active = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [builtIn, gameId, blobUrlRef]);

  useEffect(() => {
    if (!resolved) return;
    const t = window.setTimeout(() => {
      if (!loaded) setShowLoader(true);
    }, LOADING_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [resolved, loaded]);

  useEffect(() => {
    if (resolved && gameId) setLastGame(gameId);
  }, [resolved, gameId]);

  if (resolving) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="font-display text-sm uppercase tracking-wider text-primary">Loading...</p>
      </div>
    );
  }

  if (notFound || !resolved) return <GameNotFound gameId={gameId} />;

  const Loader = builtIn ? LOADERS[gameId as GameId] : null;

  return (
    <div className="fixed inset-0 bg-background p-2 sm:p-3">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <BackButton />

      {showLoader && !loaded && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-background">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, hsl(var(--primary) / 0.15) 0px, hsl(var(--primary) / 0.15) 1px, transparent 1px, transparent 4px)",
            }}
          />
          {Loader && (
            <div className="relative rounded-md border border-primary/60 bg-card/60 p-6 border-glow">
              <Loader />
            </div>
          )}
          <div className="relative text-center">
            <p className="font-display text-2xl uppercase tracking-wider text-primary text-glow">
              {resolved.title}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              &gt; {resolved.loadingFlavor}
            </p>
          </div>
        </div>
      )}

      <div className="relative h-full w-full overflow-hidden rounded-md border border-primary/50 bg-card border-glow">
        <iframe
          src={resolved.src}
          title={resolved.title}
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0 bg-background"
          allow="fullscreen; autoplay; gamepad"
        />
      </div>
    </div>
  );
};

export default PlayGame;
