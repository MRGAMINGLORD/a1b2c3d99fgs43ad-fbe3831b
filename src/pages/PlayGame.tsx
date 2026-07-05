import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { setLastGame } from "@/lib/gameStorage";
import { fetchCustomGame } from "@/hooks/useCustomGames";
import { ConfirmExitLink } from "@/components/ConfirmExitLink";
import { GameErrorOverlay } from "@/components/GameErrorOverlay";

type GameId =
  | "turtle-trade-co"
  | "defense-of-belgium"
  | "waffle-craft"
  | "golden-grid"
  | "neon-snake"
  | "gravity-runner"
  | "mini-games";

// Games with real files in /public/games/<slug>/index.html. Baked-in copies of
// previously-custom games live here too so the hub still works if this repo
// is forked without its original database.
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
  "golden-grid": {
    src: "/games/golden-grid/index.html",
    title: "Golden Grid",
    loadingFlavor: "Stacking golden waffles...",
  },
  "neon-snake": {
    src: "/games/neon-snake/index.html",
    title: "Neon Snake",
    loadingFlavor: "Powering up the neon grid...",
  },
  "gravity-runner": {
    src: "/games/gravity-runner/index.html",
    title: "Gravity runner",
    loadingFlavor: "Flipping gravity...",
  },
  "mini-games": {
    src: "/games/mini-games/index.html",
    title: "Mini Games",
    loadingFlavor: "Loading the arcade cabinet...",
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

// Falling golden waffles — for Golden Grid.
const GoldenGridLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden bg-background">
    <div
      aria-hidden
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    />
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="absolute h-4 w-4 rounded-sm bg-primary"
        style={{
          left: `${10 + i * 14}%`,
          top: "-10%",
          boxShadow: "0 0 8px hsl(var(--primary)), inset 0 0 0 1px hsl(var(--background))",
          animation: "gg-fall 1.8s linear infinite",
          animationDelay: `${i * 0.22}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes gg-fall {
        0% { top: -10%; transform: rotate(0deg); }
        100% { top: 110%; transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Pixel jumper bounding over gaps — for Gravity Runner.
const GravityRunnerLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden bg-background">
    <div className="absolute inset-x-0 bottom-10 h-1 bg-primary/60" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="absolute bottom-0 h-10 w-10 bg-primary/30"
        style={{
          left: `${i * 28 - 10}%`,
          animation: "gr-scroll 1.6s linear infinite",
          animationDelay: `${i * 0.32}s`,
        }}
      />
    ))}
    <div
      className="absolute left-10 h-4 w-4 bg-primary"
      style={{
        bottom: "2.5rem",
        boxShadow: "0 0 8px hsl(var(--primary))",
        animation: "gr-jump 0.8s ease-in-out infinite",
      }}
    />
    <style>{`
      @keyframes gr-scroll { 0%{transform:translateX(0)} 100%{transform:translateX(-28%)} }
      @keyframes gr-jump { 0%,100%{bottom:2.5rem} 50%{bottom:5rem} }
    `}</style>
  </div>
);

// Spinning arcade cabinet stack — for Mini Games collection.
const MiniGamesLoader = () => (
  <div className="relative grid h-40 w-72 grid-cols-3 grid-rows-2 gap-2 p-4">
    {["▲", "●", "■", "◆", "✦", "♥"].map((g, i) => (
      <div
        key={i}
        className="flex items-center justify-center rounded-md border border-primary/60 bg-card/40 font-display text-2xl text-primary"
        style={{
          animation: "mg-pop 1.4s ease-in-out infinite",
          animationDelay: `${i * 0.12}s`,
          boxShadow: "0 0 8px hsl(var(--primary) / 0.4)",
        }}
      >
        {g}
      </div>
    ))}
    <style>{`
      @keyframes mg-pop { 0%,100%{transform:scale(0.85);opacity:0.6} 50%{transform:scale(1.05);opacity:1} }
    `}</style>
  </div>
);

// Wise turtle in a top hat appearing from a book — for Bob the Turtle AI.
const BobTurtleLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden bg-background">
    <div className="absolute inset-x-8 bottom-4 h-8 rounded-sm border border-primary/60 bg-card/60" />
    <div className="absolute left-1/2 bottom-8 -translate-x-1/2 text-5xl" style={{ animation: "bob-bob 2.2s ease-in-out infinite" }}>
      🐢
    </div>
    <div
      className="absolute left-1/2 top-6 -translate-x-1/2 font-display text-xs uppercase tracking-widest text-primary"
      style={{ animation: "bob-think 1.5s ease-in-out infinite" }}
    >
      • • •
    </div>
    <style>{`
      @keyframes bob-bob { 0%,100%{transform:translate(-50%,0)} 50%{transform:translate(-50%,-6px)} }
      @keyframes bob-think { 0%,100%{opacity:0.3} 50%{opacity:1} }
    `}</style>
  </div>
);

// Hot waffle iron pressing — for Waffle Works.
const WaffleWorksLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden bg-background">
    <div
      className="absolute left-1/2 top-1/2 h-20 w-32 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-primary bg-primary/20"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "10px 10px",
        animation: "ww-press 1.4s ease-in-out infinite",
        boxShadow: "0 0 20px hsl(var(--primary) / 0.6)",
      }}
    />
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="absolute h-1 w-1 rounded-full bg-primary/60"
        style={{
          left: `${40 + i * 5}%`,
          top: "20%",
          animation: "ww-steam 1.8s ease-out infinite",
          animationDelay: `${i * 0.2}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes ww-press { 0%,100%{transform:translate(-50%,-50%) scaleY(1)} 50%{transform:translate(-50%,-50%) scaleY(0.85)} }
      @keyframes ww-steam { 0%{transform:translateY(0);opacity:0.8} 100%{transform:translateY(-30px);opacity:0} }
    `}</style>
  </div>
);

// Patient turtle with letter blocks — for Turtle LM.
const TurtleLMLoader = () => (
  <div className="relative h-40 w-72 overflow-hidden bg-background">
    <div className="absolute left-6 bottom-6 text-4xl" style={{ animation: "tlm-bob 2s ease-in-out infinite" }}>
      🐢
    </div>
    {["L", "M"].map((c, i) => (
      <div
        key={c}
        className="absolute flex h-8 w-8 items-center justify-center rounded-sm border border-primary bg-card/60 font-display text-lg text-primary"
        style={{
          right: `${20 + i * 36}px`,
          top: "30%",
          boxShadow: "0 0 8px hsl(var(--primary) / 0.5)",
          animation: "tlm-float 2.4s ease-in-out infinite",
          animationDelay: `${i * 0.3}s`,
        }}
      >
        {c}
      </div>
    ))}
    <style>{`
      @keyframes tlm-bob { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-4px) rotate(2deg)} }
      @keyframes tlm-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    `}</style>
  </div>
);

// NeonSnakeLoader is keyed by custom-game slug below (not a built-in id).
const LOADERS: Partial<Record<GameId, () => JSX.Element>> = {
  "turtle-trade-co": TurtleLoader,
  "defense-of-belgium": TanksLoader,
  "waffle-craft": MinecartLoader,
};
const CUSTOM_LOADERS: Record<string, () => JSX.Element> = {
  "neon-snake": NeonSnakeLoader,
  "golden-grid": GoldenGridLoader,
  "gravity-runner": GravityRunnerLoader,
  "mini-games": MiniGamesLoader,
  "bob-turtle-ai": BobTurtleLoader,
  "waffle-works": WaffleWorksLoader,
  "turtle-lm": TurtleLMLoader,
};

const BackButton = () => {
  return (
    <ConfirmExitLink
      to="/"
      ariaLabel="Back to hub"
      title="Leave the game?"
      description="Your in-game progress may not be saved. Are you sure you want to head back to the hub?"
      leaveLabel="Leave"
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

const isProbablyAppShell = (html: string) =>
  html.includes('/src/main.tsx') ||
  (html.includes('<div id="root"></div>') && html.includes('<title>Waffle</title>'));

const isStoredGameFileUrl = (url: string) =>
  /^https?:\/\//i.test(url.trim()) && url.includes('/game-files/');

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
      const makeBlobUrl = (source: string) => {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const blob = new Blob([source], { type: "text/html; charset=utf-8" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        return url;
      };

      // Prefer a real repo file only when the response is actually that file.
      // The dev server can SPA-fallback missing /games/<slug>/index.html paths
      // to the app shell, which then renders the NotFound page inside the iframe.
      const repoUrl = `/games/${gameId}/index.html`;
      try {
        const repoResponse = await fetch(repoUrl, { cache: "no-store" });
        const repoHtml = repoResponse.ok ? await repoResponse.text() : "";
        if (!active) return;
        if (active && repoResponse.ok && repoHtml.trim() && !isProbablyAppShell(repoHtml)) {
          // Try to enrich the title from the DB row, but don't block on it.
          let title = gameId;
          try {
            const row = await fetchCustomGame(gameId);
            if (row?.title) title = row.title;
          } catch {/* ignore */}
          if (!active) return;
          setResolved({
            src: repoUrl,
            title,
            loadingFlavor: "Loading custom game...",
            isCustom: true,
          });
          setResolving(false);
          return;
        }
      } catch {/* fall through to DB lookup */}

      const row = await fetchCustomGame(gameId);
      if (!active) return;
      if (!row || !row.html.trim()) {
        setNotFound(true);
        setResolving(false);
        return;
      }
      // Storage-hosted custom games can be served with stale text/plain headers.
      // Fetch them and render a local text/html Blob so HTML games run instead
      // of showing source code or a false 404 page.
      const isUrl = /^https?:\/\//i.test(row.html.trim());
      let src: string;
      if (isStoredGameFileUrl(row.html)) {
        try {
          const res = await fetch(row.html, { cache: "no-store" });
          if (!res.ok) throw new Error(`Game file returned ${res.status}`);
          src = makeBlobUrl(await res.text());
        } catch {
          if (!active) return;
          setNotFound(true);
          setResolving(false);
          return;
        }
      } else if (isUrl) {
        src = row.html.trim();
      } else {
        src = makeBlobUrl(row.html);
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

  const Loader = builtIn
    ? LOADERS[gameId as GameId] ?? (gameId && CUSTOM_LOADERS[gameId]) ?? null
    : (gameId && CUSTOM_LOADERS[gameId]) || null;

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
        {resolved.isCustom && <GameErrorOverlay gameTitle={resolved.title} gameId={gameId} />}
      </div>
    </div>
  );
};

export default PlayGame;
