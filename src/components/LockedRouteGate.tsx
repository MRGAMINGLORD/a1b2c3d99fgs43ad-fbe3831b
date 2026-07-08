// Full-page gate rendered when someone tries to open a locked game route
// directly (e.g. by typing /play/neon-snake before Sir Wafflington unlocks
// the Games sections). Mirrors LockedSectionOverlay's vagueness — never
// mentions Sir Wafflington.
import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";

export const LockedRouteGate = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background p-6">
    <div className="w-full max-w-md space-y-4 rounded-lg border border-primary/50 bg-card/70 p-8 text-center border-glow">
      <Lock className="mx-auto h-10 w-10 text-primary" aria-hidden />
      <h1 className="font-display text-xl uppercase tracking-widest text-primary">
        Locked
      </h1>
      <p className="text-sm text-muted-foreground">
        You don't have the keys to this section yet.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-background/80 px-3 py-2 font-display text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to hub
      </Link>
    </div>
  </div>
);
